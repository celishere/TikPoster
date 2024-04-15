import axios from "axios";

import * as fs from "fs/promises";
import fs_base from "fs";

const { HttpProxy, ProxyChecker } = require('free-proxy-checker');

export const downloadProxies = async () => {
    const response = await axios.get('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt');

    if (response.data) {
        const filePath = `${ __dirname }/../http.txt`;

        if (fs_base.existsSync(filePath)) {
            const oldContent = await fs.readFile(filePath, { encoding: "utf-8" });

            if (oldContent === response.data) {
                return;
            }
        }

        await fs.writeFile(`${ __dirname }/../http.txt`, response.data)
    }
}

export const readProxyList = async (): Promise<string[] | undefined> => {
    const path = `${ __dirname }/../http.txt`;

    if (!fs_base.existsSync(path)) return undefined;

    const file = await fs.readFile(path, { encoding: "utf-8" });

    return file.trim().split("\n");
}

export const checkProxies = async (proxyList: string[]): Promise<string[]> => {
    const proxiesToCheck: any[] = [];
    const validProxies: string[] = [];

    proxyList.map(async (proxy) => {
        const settings = proxy.split(":");

        proxiesToCheck.push(new HttpProxy(settings[0], settings[1]));
    })

    const proxyChecker = new ProxyChecker(proxiesToCheck, {
        concurrency: 100,
        timeout: 3000,
        verbose: true
    })

    await proxyChecker.checkProxies();
    let proxiesUp = proxyChecker.getProxiesUp();

    proxiesUp.map((proxy: any) => {
        validProxies.push(`${ proxy.host }:${ proxy.port }`)
    })

    return validProxies;
}

export const setLastCheck = async (time: number): Promise<void> => {
    await fs.writeFile(`${ __dirname }/../lastProxyCheck.dat`, String(time + 60 * 10 * 1000));
}

export const getLastCheck = async (): Promise<number> => {
    const path = `${ __dirname }/../lastProxyCheck.dat`;

    if (fs_base.existsSync(path)) {
        const data = await fs.readFile(path, { encoding: "utf-8" });

        return Number(data);
    }

    return 0;
}

export const saveProxies = async (proxyList: string[]): Promise<void> => {
    const filePath = `${ __dirname }/../http.txt`;

    const data = proxyList.join('\n');

    await fs.writeFile(filePath, data);
}