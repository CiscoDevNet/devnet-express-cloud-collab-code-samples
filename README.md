# Code Samples for DevNet Express Cloud Collaboration tracks

These self-paced interactive tutorials provide instructions for developers to read and use code examples.

We write these labs for display within the [Cisco DevNet Learning Labs system](https://learninglabs.cisco.com).

Contributions are welcome, and we are glad to review changes through pull requests. See [contributing.md](contributing.md) for details.

Once approved, Cisco DevNet reviewers then create a release to publish through our Learning Labs system.

The goal of these learning labs is to ensure a 'hands-on' learning approach rather than theory or instructions.

## About these Learning Labs

These labs teach how to see code examples and use them.

If you need more help, you can reach out to DevNet through one of our [support options](https://developer.cisco.com/site/devnet/support/).

## Preview Learning Lab Markdown locally

You can preview how the Markdown renders by using a pre-built Docker image. The `Makefile` in the root of the repository lets you run `make preview` to view the output HTML.

1. Make sure you have Docker installed locally. If not, [install Docker](https://docs.docker.com/install/) for your operating system.
```
$ docker -v
```
1. In the root of the repository, run:
```
$ make preview
```
1. Open a browser window with the URL: `http://localhost:9000`.
1. Click a folder to find the Markdown file you want to preview.
1. When you are done previewing, type `Ctrl+C` to stop running the Docker container.

## Contributor guidelines

These learning modules are for public consumption, so you must ensure that you have the rights to any content that you contribute.

Write your content in Markdown. DevNet staff reviews content according to the [Cisco Style Guide](http://www-author.cisco.com/c/en/us/td/docs/general/style/guide/Latest/stylegd.html). (Link available on Cisco VPN only.)

#### Publishing requirements

To create and publish a new lab, take the following steps:
- Add a new folder under `labs`.
- Create a JSON file with the same name as the `labs/`_folder_ name.
- Create markdown files named 1.md, 2.md, and so on; refer to those files in the `labs/`_folder_ JSON file.
- Ensure that the JSON file contains appropriate page titles and file references.
- Send a pull request to get the files committed and merged to `master` by a DevNet reviewer.

A DevNet reviewer then creates a release on the repository with the latest `master` and publishes through the admin interface.

#### Editors

You can write Markdown in a plain text editor, and desktop and Web-based options allow you to write and preview your work at the same time. We recommend Visual Studio Code [Download](https://code.visualstudio.com/) for these reasons:
- Lightweight environment for coding (or writing Markdown).
- Available on MacOS, Linux, or Windows.
- Github Client integration.
- Great Markdown preview features native in the editor.
- Intuitive operation and structure.

You can validate a JSON file by using the [online formatter and validator](https://jsonformatter.curiousconcept.com).

## Getting involved

* If you'd like to contribute to an existing lab, refer to [contributing.md](contributing.md).
* If you're interested in creating a new Cisco DevNet Learning Lab, please contact a DevNet administrator for guidance.
