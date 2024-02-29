//code owner - XeonBotInc
try {
  const makeWASocket = require("@whiskeysockets/baileys").default;
  const qrcode = require("qrcode-terminal");
  const fs = require("fs");
  const pino = require("pino");
  const {
    delay,
    useMultiFileAuthState,
    BufferJSON,
    fetchLatestBaileysVersion,
    PHONENUMBER_MCC,
    DisconnectReason,
    makeInMemoryStore,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    Browsers,
  } = require("@whiskeysockets/baileys");
  const Pino = require("pino");
  const NodeCache = require("node-cache");
  const chalk = require("chalk");
  const readline = require("readline");
  const { parsePhoneNumber } = require("libphonenumber-js");

  const pairingCode = true;
  const useMobile = process.argv.includes("--mobile");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (text) =>
    new Promise((resolve) => rl.question(text, resolve));
  async function start() {
    let phoneNumber = await question(
      chalk.bgBlack(chalk.greenBright(`🚀 Enter your mobile-number:`)),
    );

    async function qr(phoneNumber) {
      //------------------------------------------------------
      const dirsession = `./sessions${phoneNumber}`;
      if (!fs.existsSync(dirsession)) {
        fs.mkdirSync(dirsession);
      }
      let { version, isLatest } = await fetchLatestBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(dirsession);
      const msgRetryCounterCache = new NodeCache(); // for retry message, "waiting message"

      const browsers = ["Safari", "Firefox", "Chrome", "EDGE"];

      function getRandomBrowser() {
        const randomIndex = Math.floor(Math.random() * browsers.length);
        return browsers[randomIndex];
      }

      const randomBrowser = getRandomBrowser();

      const latestWebVersion = () => {
        let version;
        try {
          let a = fetchJson(
            "https://web.whatsapp.com/check-update?version=1&platform=web",
          );
          version = [a.currentVersion.replace(/[.]/g, ", ")];
        } catch {
          version = [2, 2204, 13];
        }
        return version;
      };
      const XeonBotInc = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !pairingCode, // popping up QR in terminal log
        mobile: useMobile, // mobile api (prone to bans)
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            Pino({ level: "fatal" }).child({ level: "fatal" }),
          ),
        },
        browser: Browsers.macOS(randomBrowser), // for this issues https://github.com/WhiskeySockets/Baileys/issues/328
        markOnlineOnConnect: false, // set false for offline
        generateHighQualityLinkPreview: true, // make high preview link
        getMessage: async (key) => {
          let jid = jidNormalizedUser(key.remoteJid);
          let msg = await store.loadMessage(jid, key.id);

          return msg?.message || "";
        },
        msgRetryCounterCache, // Resolve waiting messages
        defaultQueryTimeoutMs: undefined, // for this issues https://github.com/WhiskeySockets/Baileys/issues/276
        latestWebVersion,
      });

      // login use pairing code
      // source code https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts#L61
      if (pairingCode && !XeonBotInc.authState.creds.registered) {
        if (useMobile)
          throw new Error("Cannot use pairing code with mobile api");

        if (!!phoneNumber) {
          phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

          if (
            !Object.keys(PHONENUMBER_MCC).some((v) => phoneNumber.startsWith(v))
          ) {
            console.log(
              chalk.bgBlack(
                chalk.redBright(
                  "Start with country code of your WhatsApp Number, Example : +94766632281",
                ),
              ),
            );
            process.exit(0);
          }
        } else {
          phoneNumber = await question(
            chalk.bgBlack(chalk.greenBright(`🚀 Enter your mobile-number:`)),
          );
          phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

          // Ask again when entering the wrong number
          if (
            !Object.keys(PHONENUMBER_MCC).some((v) => phoneNumber.startsWith(v))
          ) {
            console.log(
              chalk.bgBlack(
                chalk.redBright(
                  "Start with country code of your WhatsApp Number, Example : +94766632281",
                ),
              ),
            );

            phoneNumber = await question(
              chalk.bgBlack(chalk.greenBright(`🚀 Enter your phoneNumber:`)),
            );
            phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
            rl.close();
          }
        }

        setTimeout(async () => {
          let code = await XeonBotInc.requestPairingCode(phoneNumber);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log(
            chalk.black(chalk.bgGreen(`🎉 Your Pairing Code : `)),
            chalk.black(chalk.white(code)),
          );
        }, 3000);
      }
      //------------------------------------------------------
      XeonBotInc.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection == "open") {
          await delay(1000 * 10);

          function generateRandomText() {
            const prefix = "3EB";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let randomText = prefix;

            for (let i = prefix.length; i < 22; i++) {
              const randomIndex = Math.floor(Math.random() * characters.length);
              randomText += characters.charAt(randomIndex);
            }

            return randomText;
          }

          const randomText = generateRandomText();

          let sessionXeon = fs.readFileSync(`${dirsession}/creds.json`);
          let c = Buffer.from(sessionXeon).toString("base64");

          /*let {upload} = require('./mega')

const user_jid = jidNormalizedUser(XeonBotInc.user.id);
                const mega_url = await upload(fs.createReadStream('./sessions/' + 'creds.json'), `${user_jid}.json`);
const string_session = mega_url.replace('https://mega.nz/file/', '')
let md = "PRABATH-MD~" + string_session
await XeonBotInc.sendMessage(user_jid, {
                  text: md
             }, {messageId: randomText});*/
          await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: c });

          ///////////////////////////////////////////

          try {
            const { upload } = require("./mega");
            const user_jid = jidNormalizedUser(XeonBotInc.user.id);
            const mega_url = await upload(
              fs.createReadStream(`${dirsession}/creds.json`),
              `${user_jid}.json`,
            );
            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              "",
            );
            let md = string_session;
            await XeonBotInc.sendMessage(
              user_jid,
              { text: md },
              { messageId: randomText },
            );
          } catch (e) {
            XeonBotInc.sendMessage(
              XeonBotInc.user.id,
              { text: c },
              { messageId: randomText },
            );
          }

          let x = "```";
          let desc = `*Welcome to CHAMIKA-MD WhatsApp Bot* 🎉`;

          //await XeonBotInc.sendMessage(XeonBotInc.user.id, {text:desc}, {messageId: randomText})

          await delay(1000 * 2);
          await XeonBotInc.ws.close();
          fs.rmSync(`${dirsession}/`, {
            recursive: true,
            force: true,
          });

          question(
            chalk.bgBlack(chalk.greenBright(`✔️ Connection Successful`)),
          );

          await delay(1000 * 2);
          process.exit(0);
        }
        if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode != 401
        ) {
          await qr(phoneNumber);
        }
      });
      XeonBotInc.ev.on("creds.update", saveCreds);
      XeonBotInc.ev.on("messages.upsert", () => {});
    }
    await qr(phoneNumber);
  }
  start();
  process.on("uncaughtException", function (err) {
    let e = String(err);
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    console.log("Caught exception: ", err);
  });
} catch (e) {
  //console.log(e)
}
