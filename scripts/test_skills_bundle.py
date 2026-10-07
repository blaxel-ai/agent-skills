import copy
import gzip
import hashlib
import io
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

import skills_bundle


class SkillsBundleTest(unittest.TestCase):
    def setUp(self):
        self.output = tempfile.TemporaryDirectory(prefix="blaxel-skills-test-")
        self.addCleanup(self.output.cleanup)
        self.root = Path(self.output.name)
        self.manifest = skills_bundle.build(self.root, "0.1.121")
        self.bundle = (self.root / "skills.tar.gz").read_bytes()

    def test_reproducible_bundle_from_committed_revision(self):
        again = skills_bundle.build(self.root / "again", "0.1.121", self.manifest["revision"])
        self.assertEqual(again, self.manifest)
        self.assertEqual(self.bundle, (self.root / "again" / "skills.tar.gz").read_bytes())
        skills_bundle.validate(self.manifest, self.bundle)

    def test_manifest_contract(self):
        for key, invalid in {"revision": "main", "bundleUrl": "https://example.org/skills.tar.gz", "sha256": "0" * 64, "minimumCli": "dev"}.items():
            with self.subTest(key=key), self.assertRaises(ValueError):
                manifest = copy.deepcopy(self.manifest)
                manifest[key] = invalid
                skills_bundle.validate(manifest, self.bundle)

    def test_rejects_unsafe_archives_and_missing_skills(self):
        for name, kind in [("../escape", tarfile.REGTYPE), (f"agent-skills-{self.manifest['revision']}/skills/blaxel-cli/link", tarfile.SYMTYPE), (f"agent-skills-{self.manifest['revision']}/skills/readme.txt", tarfile.REGTYPE)]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                output = io.BytesIO()
                with tarfile.open(fileobj=output, mode="w") as archive:
                    entry = tarfile.TarInfo(name)
                    entry.type = kind
                    archive.addfile(entry)
                bundle = gzip.compress(output.getvalue(), mtime=0)
                manifest = dict(self.manifest, sha256=hashlib.sha256(bundle).hexdigest())
                skills_bundle.validate(manifest, bundle)

    def test_cli_validate_detects_corruption(self):
        (self.root / "skills.tar.gz").write_bytes(self.bundle + b"corruption")
        result = subprocess.run(["python3", "scripts/skills_bundle.py", "validate", "--manifest", str(self.root / "skills-manifest.json"), "--bundle", str(self.root / "skills.tar.gz")], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"checksum mismatch", result.stderr)

    def test_publication_does_not_replace_an_existing_release(self):
        # Execute the workflow's publication block with a local gh fixture;
        # no GitHub credentials, tags, releases or network are involved.
        workflow = Path(".github/workflows/skills-bundle.yml").read_text()
        script = workflow.split("        run: |\n", 1)[1]
        script = "\n".join(line[10:] for line in script.splitlines())
        helper = self.root / "gh"
        helper.write_text('#!/bin/sh\nif [ "$2" = "view" ]; then exit "$EXISTS"; fi\nprintf "%s\\n" "$*" > "$CALLS"\n')
        helper.chmod(0o755)
        for existing in (True, False):
            with self.subTest(existing=existing):
                calls = self.root / f"calls-{existing}"
                environment = dict(os.environ, PATH=str(self.root)+os.pathsep+os.environ["PATH"], EXISTS="0" if existing else "1", CALLS=str(calls), REVISION=self.manifest["revision"], GH_TOKEN="fixture", GH_REPO=skills_bundle.REPO)
                result = subprocess.run(["bash", "-e", "-o", "pipefail", "-c", script], env=environment, capture_output=True)
                self.assertEqual(result.returncode != 0, existing)
                self.assertEqual(calls.exists(), not existing)
                if not existing:
                    self.assertIn("release create skills-"+self.manifest["revision"], calls.read_text())


if __name__ == "__main__":
    unittest.main()
