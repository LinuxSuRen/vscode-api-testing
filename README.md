[API Testing](https://github.com/linuxsuren/api-testing) for Visual Studio Code

## Prerequisities
Start [atest](https://github.com/linuxsuren/api-testing) in server mode before get started.

You could run it in Docker or Kubernetes, please see also the following example:

```shell
docker run -d -p 9090:9090 ghcr.io/linuxsuren/api-testing
```

## Usage
Please see the [sample](https://github.com/LinuxSuRen/api-testing/tree/master/sample) if you're not familiar with it.

For mulitple environments use case, you could put a special file `env.yaml` in your desired directory:

```yaml
- name: localhost # environment name
  env:
    SERVER: http://localhost:9090 # environment variables
```
