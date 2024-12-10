import axios from 'axios';
import readline from 'readline';
import qrcode from 'qrcode-terminal';

const verifierHost = 'http://localhost:3010';


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

async function getUserInput(question) {
    return new Promise((resolve) => {
      rl.question(question, (input) => {
        resolve(input);
      });
    });
  }
  
const getVerifyData = async () => {
    const query_data = {
        chainID: "80002",
        skipClaimRevocationCheck: false,
        scope: [
          {
            circuitID: "credentialAtomicQueryMTPV2",
            id: 1,
            query: {
              context: "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
              allowedIssuers: [
                "*"
              ],
              type: "KYCAgeCredential",
              skipClaimRevocationCheck: true,
              credentialSubject: {
                birthday: {
                  $lt: 20201010
                }
              }
            }
          }
        ]
      };

     const response = await axios.post(`${verifierHost}/sign-in`, query_data)    
     if(response.status !== 200) {
        console.log('Error: ', response.data.message);
        return null;
     }

     const data = response.data;
     console.log('Data: ', data);

     return data;
    
};

const postJWZ = async (sessionID, jwz) => {
    //post jwz data as plain text
    const response = await axios.post(`${verifierHost}/callback?sessionID=${sessionID}`, 
    jwz, 
    {
        headers: {
            'Content-Type': 'text/plain'
        }
    }
    );
    if(response.status !== 200) {
        console.log('Error: ', response.data.message);
        return null;
    }

    const data = response.data;
    console.log('Data: ', data);

    return data;
}

const getSessionStatus = async (sessionID) => {
    //http://localhost:3010/status?sessionID=5dcda7b2-4db8-47d5-8b02-10929e915ee8
    const response = await axios.get(`${verifierHost}/status?sessionID=${sessionID}`);
    if(response.status !== 200) {
        console.log('Error: ', response.data.message);
        return null;
    }

    const data = response.data;
    console.log('Status Data: ', data);

    return data;
}

const main = async () => {

    const option = await getUserInput(`Tell me what you want to do: 
        (v) -> Verify 
        (c) -> Check
        (r) -> Resend 
    `);

    if(option === 'verify' || option === 'v') {
        const respData = await getVerifyData();
        if(respData === null) {
            console.log('Error getting verify data');
            return;
        }
        
        console.log('Response Data: ', respData);

        console.log('Session Id: ', respData.sessionID);

        qrcode.generate(respData.qrCode, {small: true});
        


    }else if(option === 'check' || option === 'c') {
        const sessionID = await getUserInput('Enter the session id: ');

        const sessionStatus = await getSessionStatus(sessionID);
        if(sessionStatus === null) {
            console.log('Error getting session status');
            return;
        }

        console.log('Session Status: ', sessionStatus.status);

    }else if(option === 'resend' || option === 'r') {
        const sessionID = await getUserInput('Enter the session ID: ');
        const jwz = await getUserInput('Enter the JWZ: ');
        
        // console.log('JWZ: ', jwz);
        // console.log('sessionID: ', sessionID);

        const respData = await postJWZ(sessionID, jwz);
        if(respData === null) {
            console.log('Error posting JWZ');
            return;
        }

        console.log('Response Data: ', respData);
    }
    rl.close();
}

main();