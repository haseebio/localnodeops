---
module: "CUDA"
errorCode: "CUDA_ERROR_INSUFFICIENT_DRIVER"
title: "CUDA driver version mismatch"
summary: "Installed CUDA toolkit version is newer than what the installed driver supports."
severity: "warning"
---

## What's actually happening

Each CUDA toolkit version requires a minimum NVIDIA driver version.
`CUDA_ERROR_INSUFFICIENT_DRIVER` means the toolkit your inference
framework was built against expects driver capabilities your currently
installed driver doesn't provide — this is a driver-vs-toolkit version
mismatch, not a GPU compatibility problem.

## Check both versions

```bash
nvidia-smi
```

The top-right of `nvidia-smi`'s output shows your installed driver
version and the maximum CUDA version that driver supports — this is
different from the CUDA toolkit version your Python environment or
inference framework has installed.

```bash
nvcc --version
```

Compare the CUDA version `nvcc` reports against the maximum version
`nvidia-smi` said your driver supports. If `nvcc`'s version is higher,
that's the mismatch.

## Fix

Update your NVIDIA driver to a version that supports your installed
CUDA toolkit — check NVIDIA's CUDA Toolkit release notes for the
minimum required driver version for your toolkit release, since this
mapping changes with each CUDA release and isn't safe to assume.

On Linux, avoid mixing driver installation methods (distro package
manager vs. NVIDIA's `.run` installer vs. Docker's NVIDIA Container
Toolkit) — partial installs from different sources are a common cause
of drivers reporting an unexpected version.

```bash
# Ubuntu/Debian: check what's actually installed
dpkg -l | grep nvidia-driver
```

If you're running inference inside Docker, confirm the host driver
(not a driver inside the container) meets the requirement — GPU
passthrough uses the host's driver, and installing a driver inside the
container has no effect.