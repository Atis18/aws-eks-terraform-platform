"""Validate effective Helm output, including the service accounts used for Pod Identity."""
from pathlib import Path
import sys

import yaml

root = Path(__file__).resolve().parents[1]
rendered_dir = Path(sys.argv[1])
for chart in ["cluster-autoscaler", "aws-load-balancer-controller", "external-secrets"]:
    values = yaml.safe_load((root / "helm" / chart / "values.yaml").read_text())
    account = values["rbac"]["serviceAccount"] if chart == "cluster-autoscaler" else values["serviceAccount"]
    expected = account["name"]
    docs = [d for d in yaml.safe_load_all((rendered_dir / f"{chart}.yaml").read_text()) if d]
    accounts = {d["metadata"]["name"] for d in docs if d["kind"] == "ServiceAccount"}
    deployments = [d for d in docs if d["kind"] == "Deployment"]
    if expected not in accounts or not any(
        d["spec"]["template"]["spec"].get("serviceAccountName") == expected for d in deployments
    ):
        raise SystemExit(f"{chart}: rendered service account does not match Pod Identity: {expected}")
    if chart == "aws-load-balancer-controller":
        arguments = [
            arg for d in deployments
            for c in d["spec"]["template"]["spec"]["containers"]
            for arg in c.get("args", [])
        ]
        flags = next((a.split("=", 1)[1] for a in arguments if a.startswith("--feature-gates=")), "")
        effective_gates = dict(item.split("=", 1) for item in flags.split(",") if item)
        for name, enabled in values["controllerConfig"]["featureGates"].items():
            if effective_gates.get(name) != str(enabled).lower():
                raise SystemExit(f"{chart}: feature gate {name} was not passed to the controller")
    print(f"{chart}: rendered ServiceAccount and Deployment agree on {expected}")
