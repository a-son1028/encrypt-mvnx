const express = require("express");
const cors = require("cors");
const logger = require("morgan");
var bodyParser = require('body-parser');
var fs = require('fs'),
    xml2js = require('xml2js')
var parser = new xml2js.Parser();
var builder = new xml2js.Builder();		

var multer = require('multer');

var upload = multer();

const app = express();

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(cors());
app.use(logger("dev"));

var singFile = upload.single('file');

app.post('/encrypt', [singFile], async (req, res) => {
	const fileContent = req.file.buffer.toString()
    const { ENC_KEY } = req.body

    const result = await new Promise((resolve, reject) => {
		parser.parseString(fileContent, function (err, result) {
			if(err) return reject(err)
			encryptObject(result.mvnx.subject, ENC_KEY)
			var xml = builder.buildObject(result);

			resolve(xml)
		});
	})

	res.setHeader('Content-disposition', 'attachment; filename=output-encrypted.mvnx')
	res.set('Content-Type', 'application/octet-stream')
	res.status(200).send(result)
})

app.post('/decrypt', [singFile], async (req, res) => {
	const fileContent = req.file.buffer.toString()
    const { ENC_KEY } = req.body
     
	const result = await new Promise((resolve, reject) => {
		parser.parseString(fileContent, function (err, resultEncrypted) {
			if(err) return reject(err)
			decryptObject(resultEncrypted.mvnx.subject, ENC_KEY)
			var decryptXml = builder.buildObject(resultEncrypted);
				
			resolve(decryptXml)
		});
	})

	res.setHeader('Content-disposition', 'attachment; filename=output-decrypted.mvnx')
	res.set('Content-Type', 'application/octet-stream')
	res.status(200).send(result)
})
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log("Server listening on " + PORT);
});



// main()
async function main() {
    var parser = new xml2js.Parser();
    var builder = new xml2js.Builder();

    console.time('timeToRun')
    fs.readFile('.' + '/input.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            // console.dir(result);
            // console.log('Done', result.mvnx.subject[0].segments[0].segment[0].points[0].point);

            encryptObject(result.mvnx.subject)
            var xml = builder.buildObject(result);
            fs.writeFileSync('./encrypt-object.xml', xml.toString())


            // decrypt

            fs.readFile('.' + '/encrypt-object.xml', function(err, data) {
                parser.parseString(data, function (err, resultEncrypted) {
                
                    
                    decryptObject(resultEncrypted.mvnx.subject)
                    var decryptXml = builder.buildObject(resultEncrypted);
                    fs.writeFileSync('./decrypt-object.xml', decryptXml.toString())
                    
                    console.timeEnd('timeToRun')
                    console.log("DONE")
                });
            });
            
        });

    });
}


function decryptObject(data, ENC_KEY) {
    if(Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            const value = data[i];


            if(typeof value === 'string') {
                try {
                    decrypt(value, ENC_KEY)
                    data[i] = decrypt(value, ENC_KEY)
                } catch (e) {}
            } else {
                decryptObject(value, ENC_KEY)
            }
        }
    }
    else if(typeof data === 'object') {
        for (const key in data) {
            const value = data[key];
            decryptObject(value, ENC_KEY)
        }
    }
    
    
}

function encryptObject(data, ENC_KEY) {
    let pattern = /^([0-9-. ]*)$/;

    if(Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            const value = data[i];


            if(value && typeof value === 'string' && !!value.match(pattern)) {
                data[i] = encrypt(value, ENC_KEY)
            } else {
                encryptObject(value, ENC_KEY)
            }
        }
    }
    else if(typeof data === 'object') {
        for (const key in data) {
            const value = data[key];
            encryptObject(value, ENC_KEY)
        }
    }
    
    
}


const crypto = require('crypto');
// const ENC_KEY = "bf3c199c2470cb477d907b1e0917c17b"; // set random encryption key
const IV = "5183666c72eec9e4"; // set random initialisation vector
// ENC_KEY and IV can be generated as crypto.randomBytes(32).toString('hex');

var encrypt = ((val, ENC_KEY) => {
  let cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, IV);
  let encrypted = cipher.update(val, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
});

var decrypt = ((encrypted, ENC_KEY) => {
  let decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, IV);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  return (decrypted + decipher.final('utf8'));
});