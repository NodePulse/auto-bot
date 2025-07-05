import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const GH_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const FILE_PATH = process.env.FILE_PATH || ".daily-log.txt";

const octokit = new Octokit({ auth: GH_TOKEN });

export default async (req, res) => {
    try {
        const today = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        ).toISOString().slice(0, 10);

        const { data: commits } = await octokit.repos.listCommits({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            since: `${today}T00:00:00+05:30`,
            // until: `${today}T23:59:59+05:30`,
            until: `${today}T20:39:59+05:30`,
            author: REPO_OWNER,
        });

        if (commits.length > 0) {
            return res.status(200).send("✅ Commit(s) already exist today. No action taken.");
        }

        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const oldContent = Buffer.from(fileData.content, "base64").toString();
        const newContent = oldContent + `\nAuto commit at ${new Date().toISOString()}`;

        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `🤖 Auto commit for ${today}`,
            content: Buffer.from(newContent).toString("base64"),
            sha: fileData.sha,
            committer: { name: "Auto Bot", email: "bot@example.com" },
            author: { name: "Auto Bot", email: "bot@example.com" },
        });
        console.log("✅ Auto-commit successful!");
        console.log("🔗 Commit URL:", response.data.commit.html_url);
        return res.status(201).send("✅ Auto commit created.");
    } catch (err) {
        console.error("❌ Error:", err);
        return res.status(500).send(`❌ Error: ${err.message}`);
    }
};
