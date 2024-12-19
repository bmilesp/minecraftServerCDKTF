#!/bin/bash

# *** INSERT SERVER DOWNLOAD URL BELOW ***
# Do not add any spaces between your link and the "=", otherwise it won't work. EG: MINECRAFTSERVERURL=https://urlexample


MINECRAFTSERVERURL=${minecraftServerUrl}


# Download Java
sudo yum install -y java-21-amazon-corretto-headless
# Install MC Java server in a directory we create
#adduser minecraft
mkdir /opt/minecraft/
mkdir /opt/minecraft/server/
cd /opt/minecraft/server

# Download server jar file from Minecraft official website
wget $MINECRAFTSERVERURL

# Generate Minecraft server files and create script
chown -R ec2-user:ec2-user /opt/minecraft/
java -Xmx1300M -Xms1300M -jar server.jar nogui
sleep 40
sed -i 's/false/true/p' eula.txt
touch start
printf '#!/bin/bash\njava -Xmx1300M -Xms1300M -jar server.jar nogui\n' >> start
chmod +x start
sleep 1
touch stop
printf '#!/bin/bash\nkill -9 $(ps -ef | pgrep -f "java")' >> stop
chmod +x stop
sleep 1

#edit server.properties
sed -i 's/gamemode=survival/gamemode=creative/' server.properties
sed -i 's/allow-flight=false/allow-flight=true/' server.properties
sed -i 's/enable-command-block=false/enable-command-block=true/' server.properties
sed -i 's/server-port=25565/server-port=10000/' server.properties
sed -i 's/difficulty=easy/difficulty=peaceful/' server.properties
sed -i 's/level-seed=/level-seed=7692505625803617061/' server.properties
sed -i '$a allow-cheats=true' server.properties

# Create SystemD Script to run Minecraft server jar on reboot
cd /etc/systemd/system/
touch minecraft.service
printf '[Unit]\nDescription=Minecraft Server on start up\nWants=network-online.target\n[Service]\nUser=ec2-user\nWorkingDirectory=/opt/minecraft/server\nExecStart=/opt/minecraft/server/start\nStandardInput=null\n[Install]\nWantedBy=multi-user.target' >> minecraft.service
sudo systemctl daemon-reload
sudo systemctl enable minecraft.service
sudo systemctl start minecraft.service

# End script