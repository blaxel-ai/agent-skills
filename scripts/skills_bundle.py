#!/usr/bin/env python3
"""Build and validate the immutable bundle consumed by the Blaxel CLI."""

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

REPO = "blaxel-ai/agent-skills"
MAX_ARCHIVE = 32 << 20
MAX_EXTRACTED = 64 << 20
MAX_ENTRIES = 10000
MAX_TAR_BYTES = MAX_EXTRACTED + MAX_ENTRIES * 1024
MAX_METADATA = 1 << 20  # Go archive/tar's maximum special-header payload.
REQUIRED_SKILLS = {"blaxel-cli", "blaxel-sdk"}


def bounded_tar(bundle):
    # Include metadata and padding in the bound before tarfile parses them.
    with gzip.GzipFile(fileobj=io.BytesIO(bundle)) as compressed:
        raw = compressed.read(MAX_TAR_BYTES + 1)
    if len(raw) > MAX_TAR_BYTES:
        raise ValueError("bundle exceeds decompressed archive limit")
    offset = 0
    while offset + 512 <= len(raw):
        header = raw[offset:offset + 512]
        if header == bytes(512):
            break
        size = tarfile.nti(header[124:136])
        if size < 0:
            raise ValueError("negative archive entry size")
        if header[156:157] in (b"x", b"g", b"L", b"K") and size > MAX_METADATA:
            raise ValueError("archive metadata exceeds CLI extractor limit")
        offset += 512 + ((size + 511) // 512) * 512
        if offset > len(raw):
            raise ValueError("truncated archive entry")
    return raw


def validate(manifest, bundle):
    revision = manifest.get("revision", "")
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("revision must be a full Git commit SHA")
    if not re.fullmatch(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", manifest.get("minimumCli", "")):
        raise ValueError("minimumCli must be a stable major.minor.patch version")
    expected_url = f"https://github.com/{REPO}/releases/download/skills-{revision}/skills.tar.gz"
    if manifest.get("bundleUrl") != expected_url:
        raise ValueError("bundleUrl must address the immutable revision release")
    if len(bundle) > MAX_ARCHIVE or hashlib.sha256(bundle).hexdigest() != manifest.get("sha256"):
        raise ValueError("bundle size or checksum mismatch")
    total, names, found = 0, set(), set()
    with tarfile.open(fileobj=io.BytesIO(bounded_tar(bundle)), mode="r:") as archive:
        for count, entry in enumerate(archive):
            total += entry.size
            if count >= MAX_ENTRIES or total > MAX_EXTRACTED:
                raise ValueError("bundle exceeds extraction limits")
            name = entry.name.rstrip("/")
            parts = name.split("/")
            if name in names or "\\" in name or any(part in ("", ".", "..") for part in parts):
                raise ValueError("duplicate or unsafe archive path")
            names.add(name)
            if parts[0] != f"agent-skills-{revision}" or len(parts) > 1 and parts[1] != "skills":
                raise ValueError("bundle entries must stay under the revision's skills directory")
            if not (entry.isdir() or entry.isfile()):
                raise ValueError("bundle must contain only ordinary directories and files")
            if len(parts) == 4 and parts[-1] == "SKILL.md":
                with archive.extractfile(entry) as skill_file:
                    text = skill_file.read().decode("utf-8")
                frontmatter = text.split("---", 2)
                if len(frontmatter) < 3 or frontmatter[0].strip():
                    raise ValueError("skill has no YAML frontmatter")
                if not re.search(rf"^name: {re.escape(parts[2])}\s*$", frontmatter[1], re.MULTILINE):
                    raise ValueError("skill name must match its folder")
                if not re.search(r"^description: \S", frontmatter[1], re.MULTILINE):
                    raise ValueError("skill needs a description")
                found.add(parts[2])
    if found != REQUIRED_SKILLS:
        raise ValueError("bundle must contain both supported public skills")


def build(output, minimum_cli, revision="HEAD"):
    commit = subprocess.check_output(["git", "rev-parse", "--verify", f"{revision}^{{commit}}"], text=True).strip()
    with subprocess.Popen(["git", "archive", "--format=tar", f"--prefix=agent-skills-{commit}/", commit, "skills"], stdout=subprocess.PIPE) as process:
        raw = process.stdout.read(MAX_EXTRACTED + (MAX_ENTRIES * 1024) + 1)
        if len(raw) > MAX_EXTRACTED + (MAX_ENTRIES * 1024):
            process.kill()
            raise ValueError("source archive exceeds size limits")
        if process.wait() != 0:
            raise ValueError("git archive failed")
    bundle = gzip.compress(raw, mtime=0)
    manifest = {
        "revision": commit,
        "bundleUrl": f"https://github.com/{REPO}/releases/download/skills-{commit}/skills.tar.gz",
        "sha256": hashlib.sha256(bundle).hexdigest(),
        "minimumCli": minimum_cli,
    }
    validate(manifest, bundle)
    output.mkdir(parents=True, exist_ok=True)
    (output / "skills.tar.gz").write_bytes(bundle)
    (output / "skills-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    builder = commands.add_parser("build")
    builder.add_argument("--output", type=Path, required=True)
    builder.add_argument("--minimum-cli", required=True)
    builder.add_argument("--revision", default="HEAD")
    checker = commands.add_parser("validate")
    checker.add_argument("--manifest", type=Path, required=True)
    checker.add_argument("--bundle", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "build":
        build(args.output, args.minimum_cli, args.revision)
    else:
        if args.manifest.stat().st_size > 16 << 10 or args.bundle.stat().st_size > MAX_ARCHIVE:
            raise ValueError("manifest or bundle exceeds size limits")
        validate(json.loads(args.manifest.read_text()), args.bundle.read_bytes())


if __name__ == "__main__":
    main()
