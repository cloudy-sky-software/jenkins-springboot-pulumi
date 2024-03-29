import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as docker from "@pulumi/docker";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("jenkins-tutorial-group");

const appServicePlan = new azure.appservice.Plan("appservice-plan", {
    kind: "Linux",
    resourceGroupName: resourceGroup.name,
    reserved: true,
    sku: {
        tier: "Basic",
        size: "B1",
    },
});

const registry = new azure.containerservice.Registry("myacr", {
    resourceGroupName: resourceGroup.name,
    sku: "Basic",
    adminEnabled: true,
});

const customImage = "spring-boot-greeting-app";
const myImage = new docker.Image(customImage, {
    imageName: pulumi.interpolate`${registry.loginServer}/${customImage}:v1.0.0`,
    build: {
        context: `../`,
    },
    registry: {
        server: registry.loginServer,
        username: registry.adminUsername,
        password: registry.adminPassword,
    },
});

const getStartedApp = new azure.appservice.AppService(customImage, {
    resourceGroupName: resourceGroup.name,
    appServicePlanId: appServicePlan.id,
    appSettings: {
      WEBSITES_ENABLE_APP_SERVICE_STORAGE: "false",
      DOCKER_REGISTRY_SERVER_URL: pulumi.interpolate`https://${registry.loginServer}`,
      DOCKER_REGISTRY_SERVER_USERNAME: registry.adminUsername,
      DOCKER_REGISTRY_SERVER_PASSWORD: registry.adminPassword,
      // Our custom image exposes port 9000.
      WEBSITES_PORT: 9000,
    },
    siteConfig: {
        alwaysOn: true,
        linuxFxVersion: pulumi.interpolate`DOCKER|${myImage.imageName}`,
    },
    httpsOnly: true,
});

export const getStartedEndpoint = pulumi.interpolate`https://${getStartedApp.name}.azurewebsites.net`;
