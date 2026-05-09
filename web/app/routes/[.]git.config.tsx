import { logHoneypot } from "@/lib/honeypot.server";

const BODY = `[core]
\trepositoryformatversion = 0
\tfilemode = true
\tbare = false
\tlogallrefupdates = true
[remote "origin"]
\turl = https://github.com/CUHK-IERG4210/shop-internal.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
\tremote = origin
\tmerge = refs/heads/master
[branch "azure/deploy"]
\tremote = origin
\tmerge = refs/heads/azure/deploy
[user]
\temail = deploy@ierg4210.com
\tname = CI Deploy Bot
`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "git-config");
    return new Response(BODY, { headers: { "Content-Type": "text/plain" } });
}
