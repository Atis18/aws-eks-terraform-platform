"""Check references between repository manifests without an AWS account."""
from pathlib import Path
import re
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFESTS = [
    doc
    for path in sorted((ROOT / "k8s").rglob("*.yaml"))
    for doc in yaml.safe_load_all(path.read_text())
    if doc
]


def resources(kind):
    return {doc["metadata"]["name"]: doc for doc in MANIFESTS if doc["kind"] == kind}


class PlatformContracts(unittest.TestCase):
    def test_service_selectors_and_target_ports_resolve_to_containers(self):
        deployments = resources("Deployment")
        services = resources("Service")
        self.assertTrue(deployments)
        self.assertTrue(services)
        for name, service in services.items():
            with self.subTest(service=name):
                selector = service["spec"]["selector"]
                self.assertTrue(selector)
                matches = [
                    d for d in deployments.values()
                    if all(d["spec"]["template"]["metadata"]["labels"].get(k) == v for k, v in selector.items())
                ]
                self.assertEqual(len(matches), 1)
                ports = [
                    p for c in matches[0]["spec"]["template"]["spec"]["containers"]
                    for p in c.get("ports", [])
                ]
                for port in service["spec"]["ports"]:
                    self.assertTrue(any(
                        p.get("name") == port["targetPort"] or p["containerPort"] == port["targetPort"]
                        for p in ports
                    ))

    def test_ingress_backends_resolve_to_service_ports(self):
        services = resources("Service")
        ingresses = resources("Ingress")
        self.assertTrue(ingresses)
        for ingress in ingresses.values():
            for rule in ingress["spec"]["rules"]:
                for path in rule["http"]["paths"]:
                    backend = path["backend"]["service"]
                    self.assertIn(backend["name"], services)
                    self.assertIn(backend["port"]["number"], [
                        p["port"] for p in services[backend["name"]]["spec"]["ports"]
                    ])

    def test_backend_configuration_keys_exist(self):
        configmaps = resources("ConfigMap")
        checked = 0
        for deployment in resources("Deployment").values():
            for container in deployment["spec"]["template"]["spec"]["containers"]:
                for env in container.get("env", []):
                    ref = env.get("valueFrom", {}).get("configMapKeyRef")
                    if ref:
                        checked += 1
                        self.assertIn(ref["name"], configmaps)
                        self.assertIn(ref["key"], configmaps[ref["name"]]["data"])
        self.assertGreater(checked, 0)

    def test_database_secret_keys_are_produced_by_external_secrets(self):
        secrets = {
            d["spec"]["target"]["name"]: {item["secretKey"] for item in d["spec"]["data"]}
            for d in resources("ExternalSecret").values()
        }
        checked = 0
        for deployment in resources("Deployment").values():
            for container in deployment["spec"]["template"]["spec"]["containers"]:
                for env in container.get("env", []):
                    ref = env.get("valueFrom", {}).get("secretKeyRef")
                    if ref:
                        checked += 1
                        self.assertIn(ref["name"], secrets)
                        self.assertIn(ref["key"], secrets[ref["name"]])
        self.assertGreater(checked, 0)

    def test_probe_ports_exist_on_the_same_container(self):
        for deployment in resources("Deployment").values():
            for container in deployment["spec"]["template"]["spec"]["containers"]:
                ports = container["ports"]
                for probe in ["readinessProbe", "livenessProbe"]:
                    port = container[probe]["httpGet"]["port"]
                    self.assertTrue(any(p.get("name") == port or p["containerPort"] == port for p in ports))

    def test_helm_accounts_match_terraform_pod_identity_associations(self):
        controllers = [
            ("cluster-autoscaler", "cluster-autoscaler.tf"),
            ("aws-load-balancer-controller", "load-balancer-controller.tf"),
            ("external-secrets", "external-secrets.tf"),
        ]
        for chart, terraform_file in controllers:
            with self.subTest(chart=chart):
                values = yaml.safe_load((ROOT / "helm" / chart / "values.yaml").read_text())
                account = values["rbac"]["serviceAccount"] if chart == "cluster-autoscaler" else values["serviceAccount"]
                identities = re.findall(r'service_account\s*=\s*"([^"]+)"', (ROOT / "terraform" / terraform_file).read_text())
                self.assertTrue(account["create"])
                self.assertIn(account["name"], identities)

    def test_autoscaler_minor_version_matches_eks(self):
        eks = (ROOT / "terraform" / "eks.tf").read_text()
        version = re.search(r'kubernetes_version\s*=\s*"(\d+\.\d+)"', eks).group(1)
        values = yaml.safe_load((ROOT / "helm" / "cluster-autoscaler" / "values.yaml").read_text())
        self.assertEqual(".".join(values["image"]["tag"].lstrip("v").split(".")[:2]), version)


if __name__ == "__main__":
    unittest.main()
