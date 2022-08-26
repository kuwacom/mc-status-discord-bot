
const fs = require('fs');
const yaml = require('js-yaml');
const dgram = require("dgram")

const seting_data_path = "./seting.yml"
const seting_data = fs.readFileSync(seting_data_path, 'utf8')
const seting_datas = yaml.load(seting_data);

const buffer = Buffer.from([0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff,0x00,0xfe,0xfe,0xfe,0xfe,0xfd,0xfd,0xfd,0xfd,0x12,0x34,0x56,0x78,0x00,0x00,0x00,0x00,0x00,0x00,0x00])


console.log(seting_datas["ip"] + " : " + seting_datas["port"])


const udp_client = dgram.createSocket("udp4")

function chek(host, port){
    udp_client.send(buffer, port, host, (err) => {
    });
}
udp_client.on("err", (err)=> {
    console.log("client error: \n" + err.stack);
    console.close()
})
udp_client.on("message", (packet, rinfo)=> {
    serverStatus = packet.toString().split("MCPE;")[1].split(";")
    console.log(serverStatus[0])
    console.log(serverStatus)
    udp_client.close()
})
udp_client.on("close", ()=> {
    console.log("closed.")
})

chek(seting_datas["ip"],seting_datas["port"])
