import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

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

        // Get today's commits
        const { data: commits } = await octokit.rest.repos.listCommits({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            since: `${today}T00:00:00+05:30`,
            until: `${today}T20:39:59+05:30`,
            author: REPO_OWNER,
        });

        const repo = await octokit.rest.repos.get({
            owner: REPO_OWNER,
            repo: REPO_NAME,
        });
        console.log(repo.data);


        if (commits.length > 15) {
            return res.status(200).send("✅ Commit(s) already exist today. No action taken.");
        }

        let oldContent = "";
        let sha = undefined;

        // Try to fetch the file; if it doesn't exist, we'll create it
        try {
            const { data: fileData } = await octokit.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: FILE_PATH,
            });
            oldContent = Buffer.from(fileData.content, "base64").toString();
            sha = fileData.sha;
        } catch (err) {
            // If file not found, we'll create it fresh
            if (err.status !== 404) {
                throw err;
            }
        }

        const newContent = oldContent + `\nAuto commit at ${new Date().toISOString()}`;

        const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `🤖 Auto commit for ${today}`,
            content: Buffer.from(newContent).toString("base64"),
            sha, // If undefined, creates new file
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
