import { Construct } from "constructs";
import { App, Fn, TerraformOutput, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { VpcSecurityGroupEgressRule } from "@cdktf/provider-aws/lib/vpc-security-group-egress-rule";
import { VpcSecurityGroupIngressRule } from "@cdktf/provider-aws/lib/vpc-security-group-ingress-rule";
import { DataAwsSsmParameter } from "@cdktf/provider-aws/lib/data-aws-ssm-parameter";
import { KeyPair } from "@cdktf/provider-aws/lib/key-pair";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { join } from "node:path";
import { Eip } from "@cdktf/provider-aws/lib/eip";
import { EbsVolume } from "@cdktf/provider-aws/lib/ebs-volume";
import { VolumeAttachment } from "@cdktf/provider-aws/lib/volume-attachment";


/***VARS ***/
const minecraftServerSSHKey = "minecraftServerSSHKey" // SSM Parameter Store parameter name id_rsa.pub for SSH Key logins
const vpcId = "vpc-xxxxxxx" // existing VPC ID
const subnetId = "subnet-xxxxxx" // existing subnet ID for the VPC

// to get the latest version of the minecraft server jar file go here https://www.minecraft.net/en-us/download/server and click the download link
const minecraftServerUrl = "https://maven.minecraftforge.net/net/minecraftforge/forge/1.12.2-14.23.5.2860/forge-1.12.2-14.23.5.2860-installer.jar" //forge version 1.12.2

//CIDR block for all https traffic
const cidrIpv4IngressMinecraft = "0.0.0.0/0"

//CIDR block for all ssh traffic
const cidrIpv4Ingress22 = "73.161.0.0/16"

const amiId = "ami-xxxxxxx" // Amazon Linux 2 AMI ID

const region = "us-east-2"
const availabilityZone = region+"b"

/***     ***/

class MinecraftStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new AwsProvider(this, "aws", {
      region: region,
    });

    const publicSSHKey = new DataAwsSsmParameter(this, "minecraftServerSSHKey",{
      name : minecraftServerSSHKey
    }).value

    new TerraformOutput(this, "publicSSHKey", { sensitive: true, value: publicSSHKey});

    const instanceScript =  Fn.templatefile(join(__dirname,'minecraftEC2Script.sh'), {
      minecraftServerUrl: minecraftServerUrl
    })

    const sshKeyPair = new KeyPair(this, "minecraftServerKeyPair", {
      keyName: "MinecraftServerKeyPair",
      publicKey: publicSSHKey,
    });

    new TerraformOutput(this, "keypair", { sensitive: true, value: sshKeyPair.keyName });


    const allowTls = new SecurityGroup(this, "allow_tls", {
      description: "Allow TLS inbound traffic and all outbound traffic",
      name: "allow_tls",
      tags: {
        Name: "allow_tls",
      },
      vpcId: vpcId,
    });
    new VpcSecurityGroupEgressRule(this, "allow_all_traffic_ipv4", {
      cidrIpv4: "0.0.0.0/0",
      ipProtocol: "-1",
      securityGroupId: allowTls.id,
    });
    new VpcSecurityGroupIngressRule(this, "allow_tls_ipv4_minecraft", {
      cidrIpv4: cidrIpv4IngressMinecraft,
      fromPort: 10000,
      ipProtocol: "tcp",
      securityGroupId: allowTls.id,
      toPort: 10000,
    });

    new VpcSecurityGroupIngressRule(this, "allow_tls_ipv4_22", {
      cidrIpv4: cidrIpv4Ingress22,
      fromPort: 22,
      ipProtocol: "tcp",
      securityGroupId: allowTls.id,
      toPort: 22,
    });

    const minecraftInstanceVolume = new EbsVolume(this, "minecraftServerVolume", {
      tags: {
        Name: "minecraftServer1-21-4Volume"
      },
      size: 25,
      type: "gp3",
      availabilityZone: availabilityZone,
      
    })
    
    const minecraftInstance = new Instance(this, "minecraft_server_1-12-2", {
      ami: amiId,
      instanceType: "t3.2xlarge",
      availabilityZone: availabilityZone,
      keyName: sshKeyPair.keyName,
      vpcSecurityGroupIds: [allowTls.id],
      subnetId: subnetId,//main.publicSubnetIds[0]
      userData: instanceScript,
      tags: {
        Name: "minecraft_server_1-12-2",
      },
      provisioners: [

      ]
      
    });    

    new VolumeAttachment(this, "minecraftServerVolumeAttachment", {
      deviceName: "/dev/sdb",
      instanceId: minecraftInstance.id,
      volumeId: minecraftInstanceVolume.id
    })

    new Eip(this, "minecraftServerElasticIp", {
      domain: "vpc",
      instance: minecraftInstance.id
    })
  };
}

const app = new App();
new MinecraftStack(app, "minecraftServer");
app.synth();
