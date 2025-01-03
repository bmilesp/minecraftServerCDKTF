#!/bin/bash

# *** INSERT SERVER DOWNLOAD URL BELOW ***
# Do not add any spaces between your link and the "=", otherwise it won't work. EG: MINECRAFTSERVERURL=https://urlexample


MINECRAFTSERVERURL=${minecraftServerUrl}


# Download Java
#sudo yum install -y java-8-amazon-corretto-headless
#### need old java 8!
sudo yum install java-1.8.0
# Install MC Java server in a directory we create
#adduser minecraft
mkdir /opt/minecraft/
cd /opt/minecraft

# Download server jar file from Minecraft official website
wget $MINECRAFTSERVERURL

# Generate Minecraft server files and create script


java -Xmx1300M -Xms1300M -jar server.jar --installServer server
cd /opt/minecraft/server
sleep 40
touch start
# since java 1.8 is not in the path (the new pre installed Amazon Linux version is), we need to specify the path to the specific java executable
printf '#!/bin/bash\n/usr/lib/jvm/java-1.8.0-amazon-corretto.x86_64/jre/bin/java -Xmx1300M -Xms1300M -jar forge-1.12.2-14.23.5.2860.jar nogui\n' >> start
chmod +x start
sleep 1
touch stop
printf '#!/bin/bash\nkill -9 $(ps -ef | pgrep -f "java")' >> stop
chmod +x stop
sleep 1
touch eula.txt
sed -i 's/false/true/p' eula.txt

touch server.properties #copy and paste serrver.properties from minecraft.fandom.com/wiki/server.properties

#edit server.properties
sed -i 's/gamemode=survival/gamemode=creative/' server.properties
sed -i 's/allow-flight=false/allow-flight=true/' server.properties
sed -i 's/enable-command-block=false/enable-command-block=true/' server.properties
sed -i 's/server-port=25565/server-port=10000/' server.properties
sed -i 's/difficulty=easy/difficulty=easy/' server.properties
sed -i 's/level-seed=/level-seed=7692505625803617061/' server.properties
sed -i '$a allow-cheats=true' server.properties


# Create SystemD Script to run Minecraft server jar on reboot
cd /etc/systemd/system/
touch minecraft.service
printf '[Unit]\nDescription=Minecraft Server on start up\nWants=network-online.target\n[Service]\nUser=ec2-user\nWorkingDirectory=/opt/minecraft/server\nExecStart=/opt/minecraft/server/start\nStandardInput=null\n[Install]\nWantedBy=multi-user.target' >> minecraft.service
sudo systemctl daemon-reload
sudo systemctl enable minecraft.service
sudo systemctl start minecraft.service

#remember to ssh into the server manually and in the server console add /op <your username> to give yourself admin permissions

# End script