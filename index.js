const { Client, Intents, MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const client = new Client({
    intents:["GUILDS", "GUILD_MESSAGES"],
    ws:{properties:{$browser:"Discord iOS"}}
});
const fs = require('fs');
const yaml = require('js-yaml');
const dgram = require("dgram");
const { resolve } = require('path');
const { rejects } = require('assert');
const { channel } = require('diagnostics_channel');

const buffer = Buffer.from([0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff,0x00,0xfe,0xfe,0xfe,0xfe,0xfd,0xfd,0xfd,0xfd,0x12,0x34,0x56,0x78,0x00,0x00,0x00,0x00,0x00,0x00,0x00])


const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

let taskDataList = JSON.parse(fs.readFileSync('./task_data.json', 'utf8'));

const seting_data_path = "./seting.yml"
const seting_data = fs.readFileSync(seting_data_path, 'utf8')
const seting_datas = yaml.load(seting_data);

async function chekServerStatus(host, port){
    const udp_client = dgram.createSocket("udp4")
    try{
        udp_client.send(buffer, port, host, (err) => {
        });
    }catch(e){
        return "offline"
    }
    return await new Promise((resolve, reject) => {
        udp_client.on("err", (err)=> {
            console.log("client error: \n" + err.stack);
            udp_client.close()
            reject(err)
        })
        udp_client.on("message", (packet, rinfo)=> {
            udp_client.close()
            resolve(packet)
        })
    }).then((packet)=>{
        udp_client.on("close", ()=> {
            console.log("closed.")
        })
        if (!packet.toString().match(/MCPE/)){
            return "offline"
        }else{
            return {
                motd : packet.toString().split("MCPE;")[1].split(";")[0],
                motdSub : packet.toString().split("MCPE;")[1].split(";")[6],
                version : packet.toString().split("MCPE;")[1].split(";")[2],
                protocolVersion : packet.toString().split("MCPE;")[1].split(";")[1],
                player : packet.toString().split("MCPE;")[1].split(";")[3],
                playerMax : packet.toString().split("MCPE;")[1].split(";")[4],
                gamemode : packet.toString().split("MCPE;")[1].split(";")[7],
                gamemodeNumber : packet.toString().split("MCPE;")[1].split(";")[8],
                ipv4Port : packet.toString().split("MCPE;")[1].split(";")[9],
                ipv6Port : packet.toString().split("MCPE;")[1].split(";")[10]
            }
        }
    })
}


client.once("ready", async () => {
    const data = [{
        name: "mcstatus",
        description: "統合版サーバーの参加人数を指定したチャンネルにリアルタイムで反映します",
    }];
    
    // client.guilds.cache.map(guild => client.application.commands.set(data, guild))
    for (guild of client.guilds.cache){
        await client.application.commands.set(data, guild.id);
        console.log(guild.id+" has been set application")
    }
    console.log("ALL Guild set application");
    await client.application.commands.set(data);
    console.log("Global set application Ready!");
});

client.on('ready',() => {
    console.log("接続しました！");
    task()
});

const prefix = seting_datas['prefix']

client.on('messageCreate', async message => {
    if(message.author.bot){return};
    if (!message.content.startsWith(prefix)) return
    const [command, ...args] = message.content.slice(prefix.length).split(' ')

    if (command === 'mcstatus' || command === 'ms') {
        let num = 0
        if(!message.guild.channels.cache.find((channel) => channel.id === args[2])){
            message.channel.send("正しいチャンネルIDを入力してください")
        }
        if(args[3] == "txt"){
            if(message.guild.channels.cache.find((channel) => channel.id === args[2]).type == "GUILD_VOICE"){
                message.channel.send("ボイスチャンネルへテキストタイプを指定することはできません！")
            }
        }
        try{
            for (taskData of taskDataList){
                if(taskData["guildId"] == message.guild.id){
                    taskDataList[num] = {
                        ip: args[0],
                        port: args[1],
                        channelId: args[2],
                        guildId: message.guild.id,
                        type: args[3]
                    }
                    fs.writeFileSync('./task_data.json', JSON.stringify(taskDataList))
                    return
                }
                num++
            }
            taskDataList.push({
                ip: args[0],
                port: args[1],
                channelId: args[2],
                guildId: message.guild.id,
                type: args[3]
            })
        }catch(e){
            message.channel.send("エラーが発生しました\nコマンドを確認して入力してください")  
            console.log(e)          
        }

        fs.writeFileSync('./task_data.json', JSON.stringify(taskDataList));
    }
});

async function task(){
    while (true){
        console.log("now_tasking...")
        let channel
        try{
            for (taskData of taskDataList){
                console.log("loading"+taskData["ip"]+":"+taskData["port"])
                serverStatus = await chekServerStatus(taskData["ip"],taskData["port"])
                channel = client.channels.cache.find((channel) => channel.id === taskData["channelId"])
                if(taskData["type"] == "name"){
                    if (serverStatus == "offline"){
                        channel.setName(serverStatus["server is"])
                    }else{
                    channel.setName(serverStatus["player"]+"/"+serverStatus["playerMax"])
                    }
                }else{
                    embed = new MessageEmbed()
                    .setColor(0x00ff00)
                    .setTitle("サーバーステータス")
                    .setDescription("**"+serverStatus["player"]+"/"+serverStatus["playerMax"]+"**")
                    .setTimestamp()

                    channel.send({ embeds: [embed] })
                }
            }
        }catch(e){
            console.log(e)
        }
        await sleep(10000)
    }
}

client.login(seting_datas.token)