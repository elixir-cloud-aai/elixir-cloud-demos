# Demonstrator 2023-ecp-f2f

- **Venue:** [ELIXIR Compute Platform Face-to-Face Meeting, Helsinki](https://elixir-europe.org/events/elixir-compute-platform-2023-face-face-meeting)
- **Date:** Feb 8/9, 2023

## Objectives

1. Demonstrate task execution via [GA4GH Task Execution Service (TES)
   API][specs-tes] with [`curl`][soft-curl] and [`py-tes`][soft-py-tes] on
   [Kubernetes][soft-kube] (with [TESK][soft-tesk]) and high-performance
   computing (HPC) or high-throughput (HTC) computing clusters (with
   [Funnel][soft-funnel]).
2. Demonstrate task distribution via [proTES][soft-protes] TES gateway (random
   and distance-based task distribution logic).
3. Demonstrate [CWL][lang-cwl] and workflow execution via the TES backend of
   the [cwl-tes][soft-cwl-tes] workflow engine.

## Service requirements

The following services were deployed for the demo:

| Service | Version / Image | Configuration | Comment |
| --- | --- | --- | --- |
| [TESK][soft-tesk] | `cerit.io/tes-wes/tesk-api:0.1` | Authorization checks disabled; RW permissions for FTP preconfigured | Deployments for Kubernetes and OpenShift |
| [Funnel][soft-funnel] | `0.10.1` (OpenPBS) / commit `#52ef90f` (Slurm) | Basic authentication; FTP access via basaic auth credentials in FTP URLs | Deployments for OpenPBS and Slurm; others possible but untested |
| [proTES][soft-protes] | `elixircloud/protes:20230218` | Authorization checks disabled; all TESK and Funnel instances need to be listed in `tes.service_list` in the app configuration prior to deployment | |
| [vsftpd][soft-vsftpd] | `3.0.2-29.el7_9.x86_64` on Rocky Linux 8 | Basic authentication | Deployments at multiple locations can be used for reading inputs, but not writing outputs, as long as access credentials are set in TESK instances _and_ basic authentication credentials are passed as part of the FTP URLs to Funnel |

> In this demo, publicly available services of the ELIXIR Cloud are used. You
> can try to use these for testing, but there is no guarantee that these
> services, with compatible images and configurations, will be deployed at any
> given time. In case of connection or functional issues, you will need to
> deploy one, more or all of the services yourself according to the individual
> instructions.

## Client requirements

You can install all client requirements with [Conda][soft-conda] or
[Mamba][soft-mamba] (recommended):

```bash
conda env install -f environment.yml
```

Currently, the demo is relying on fixes of `cwl-tes` and `py-tes` that have
not been merged to the upstream or released, yet, respectively.

For `py-tes` this means that we will have to uninstall the version that is
installed along with `cwl-tes` and then manually reinstall a version from a
specific commit on a fork:

```bash
pip uninstall py-tes
pip install git+https://github.com/ohsu-comp-bio/py-tes.git@a9ac2959fdb38bd31433d358724e20c2c544c6a1
```

You can verify the successful installation of dependencies by executing the
following commands:

```bash
curl --version
cwl-tes --version
jq --version
jupyter --version
jupyter-lab --version
snakemake --version
```

Next, you need to create a listing of the available TES instances in a
comma-seprated file `.tes_instances`. Two fields/columns are required, a
description of the TES instance, and the URL pointing to it. You can use the
following command to create such a file, but make sure to replace the example
contents and do not use commas in the name/description field:

```bash
cat << "EOF" > .tes_instances
Funnel/Slurm @ YourNode,https://tes.your-node.org/
Funnel/PBS @ YetAnotherNode,https://tes.yet-another-node.org/
TESK/Kubernetes @ OtherNode,https://tes.other-node.org/
EOF
```

> Note that due to some differences between TESK and Funnel in handling FTP
> files, it is important that any Funnel service contains the substring
> `Funnel`(case-sensitive!) in its name/description, as in the example content.
> Otherwise, some of the demo tasks will not work for Funnel services!

You will also need to create a comma-separated file `.inputs`, containing the
locations of input files and the URLs pointing to them, in the first and second
field, respectively. Additionally, the file needs to include one row, in which
the first field is `workflow` (case-sensitive!). This file will be used as an
input to the example CWL workflow in the last part. You can use the following
command to create such a file, but make sure to replace the example contents.
Also make sure not to include commas in the file location field.

```bash
cat << "EOF" > .inputs
location_x,https://link.to.some/file.txt
location_y,https://link.to.some/other_file.tab
location_z,https://link.to.some/third_file.png
workflow,https://link.to.some/workflow_input
```

Finally, you will need to create a secrets file `.env` with the following
command.  You can either set the environment variables in your shell or set the
actual values in the command below. Either way, you need to create the file, it
is not sufficient to just the environment variables in your shell!

```bash
cat << EOF > .env
FTP_USER=$FTP_USER
FTP_PASSWORD=$FTP_PASSWORD
FUNNEL_SERVER_USER=$FUNNEL_SERVER_USER
FUNNEL_SERVER_PASSWORD=$FUNNEL_SERVER_PASSWORD
TES_GATEWAY=$TES_GATEWAY
FTP_INSTANCE=$FTP_INSTANCE
EOF
```

> If you want to run the demo on the ELIXIR Cloud infrastructure, please
> contact us so that we can share the TES instances and secrets with you.

## Start notebook server

Start the [Jupyter][soft-jupyter] notebook server with the following command:

```bash
jupyter-lab demo.ipynb
```

## Run demo

Execute the demo using the Jupyter notebook. If you have never used JupyterLab
before, read the [official documentation][docs-jupyter-lab].

## Limitations

Here is a list of some limitations that users and developers should be aware of
before investing into GA4GH TES-based cloud infrastructure right now.

- There is no way of passing storage provider credentials dynamically using TES
  requests. And even if there was, these would potentially need to passed on
  along a series of clients and services. For FTP access, Funnel solves this
  by expecting URLs that contain basic auth credentials. This makes passing
  along credentials easy, but it is perhaps not very safe, as credentials may
  inadvertently appear in log files if clients do not handle such URLs with
  care. TESK, on the other hand, is currently unable to process such URLs and
  instead needs to have access to cloud storage solutions preconfigured during
  deployment, which limits the ability to access storage solutions dynamically.
- The different behavior of Funnel and TESK with respect to FTP/storage
  credentials is currently limiting their interoperability, as we needed to
  implement specific checks in proTES and in payload preparation to overcome
  them.
- FTP is currently the only cloud storage solution that is supported and fully
  tested together across all used services and clients. In principle, all
  services and clients should also have support for S3 storage, but the
  interplay has not been fully tested, and the code supporting S3 in `cwl-tes`
  has not been released or fully merged upstream.
- The demo relies on a few features/changes in `py-tes` that are not part of
  the latest release and have also not been fully merged upstream yet.
- proTES, TESK and the `cwl-tes` and `py-tes` clients support passing an OAuth2
  Bearer token for authorization. However, for the demo, authorization
  requirements for these services were lifted, partly because Funnel currently
  does not support token-based authorization (requiring basic authentication
  instead), and partly because there are currently no interoperable access
  control guidelines that would make this mechanism useful outside of the
  scope of a single cloud with its own access control implementation.
- The demo currently requires that all Funnel instances use the same
  credentials for access control.
- The known TES instances are currently hard-coded in the proTES gateway.
- We have currently only tested workflow execution via the gateway with the CWL
  "hash splitter" workflow. In principle, other containerized CWL workflows are
  likely to run successfully on a TES-based compute network though. We also
  ave conducted promising initial tests with [Snakemake][lang-smk] workflows,
  using the Snakemake workflow engine with its TES backend. However, this has
  not been fully tested and is therefore not a part of this demo.

**We are actively working on overcoming all of these limitations to provide
end users and developers the ability to make use of GA4GH TES-based cloud
environments in production settings. Please stay tuned!**

[docs-jupyter-lab]: <https://jupyterlab.readthedocs.io/>
[lang-cwl]: <https://www.commonwl.org/>
[lang-smk]: <https://snakemake.readthedocs.io/>
[specs-tes]: <https://github.com/ga4gh/task-execution-schemas/>
[soft-conda]: <https://conda.io/>
[soft-curl]: <https://curl.se/>
[soft-cwl-tes]: <https://github.com/ohsu-comp-bio/cwl-tes>
[soft-vsftpd]: <https://security.appspot.com/vsftpd.html>
[soft-jupyter]: <https://jupyter.org/>
[soft-kube]: <https://kubernetes.io/>
[soft-funnel]: <https://ohsu-comp-bio.github.io/funnel>
[soft-mamba]: <https://mamba.readthedocs.io/>
[soft-protes]: <https://github.com/elixir-cloud-aai/proTES>
[soft-py-tes]: <https://github.com/ohsu-comp-bio/py-tes>
[soft-tesk]: <https://github.com/elixir-cloud-aai/tesk>
