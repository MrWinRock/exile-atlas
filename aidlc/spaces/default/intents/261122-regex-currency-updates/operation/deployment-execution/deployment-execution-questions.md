# Deployment Execution Questions

The working tree on `develop` contains the reviewed changes. The existing GitHub Actions workflow publishes the Docker image from `master`. It also deploys to production when automatic deployment is enabled. The local production build and scoped browser checks passed. These changes introduce no database migration. Release-time checks would cover the current production health, deployment setting, image digest, and rollback image.

## Q1. [Release owner] Release decision

What delivery should I carry out for the reviewed changes?

A. Local handoff. Keep the changes in this workspace and finish the release work as a local handoff.

B. Pull request for review. Commit and push the reviewed changes from a release branch and open a pull request to `master` for review.

C. Production release. Use the existing `master` pipeline to publish and deploy the reviewed changes when the release checks pass. Add the approved deployment window after your answer, for example `C. As soon as checks pass`.

X. Other (please specify)

[Answer]: B
