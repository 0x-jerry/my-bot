import { readFile } from "node:fs/promises";

const endpoint = "http://localhost:8080";

const sendFileUrl = `${endpoint}/send-file`;

const [user, file] = process.argv.slice(2);

const fileContent = await readFile(file);

try {
  const response = await fetch(sendFileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user,
      file: fileContent.toString("base64"),
    }),
  });

  const data = await response.json();
  console.log(`Send file success: ${JSON.stringify(data)}`);
} catch (error) {
  console.log(`Send file failed: ${String(error)}`);
}
