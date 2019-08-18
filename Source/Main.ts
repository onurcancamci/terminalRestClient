import { appendFile, readdirSync, writeFile, writeFileSync } from "fs";
import { RequestBuilder } from "RequestBuilder";
import { promisify } from "util";

global.helpers = {} as any;
import { NeverEnd } from "Utils/Wait";
import "Console";
import "Protocols/node/https";
import "Protocols/node/http";
import "Protocols/node/http2";
import "Protocols/node/ws";
import "Helpers/Body";
import "Helpers/Stream";
import { Init } from "Init";
import { Tree } from "Tree";
// tslint:disable-next-line:no-duplicate-imports
import { http } from "Protocols/node/http";


async function Main() {
	console.log("Rest Client");
	NeverEnd();
	await Init();
	//console.log(Tree.Root.children[0].request);
	const req = await RequestBuilder.Build(Tree.Root.children[0]) as http;
	try {
		const result = await req.Send();
		//await result.complete;
		console.log(await result.body, result.toJSON());
		//console.log(result, JSON.stringify(result));
	} catch (ex) {
		console.log("main catch", ex);
	}
	/*const appendFilep = promisify(appendFile);
	const buffs: Buffer[] = [];
	for (let k = 65; k <= 65 + 27; k++) {
		const buff = Buffer.alloc(1024 * 1024 * 100, String.fromCharCode(k));
		buffs.push(buff);
	}
	console.log(readdirSync("."));
	writeFileSync("out.txt", "");
	const ps: Promise<any>[] = [];
	for (const [i, buff] of buffs.entries()) {
		ps.push(appendFilep(`out.txt`, buff));
	}
	console.log("waiting now");
	await Promise.all(ps);
	console.log("done");*/
	//console.log();
	//await req.Send();
}

Main();

/*
* TODO:
*  - output handling and saving
*  - handler reutrn form send
*  - save ederken response headerlarina gore dosya uzantisi
*  - file contentine gore header yolla, binary icin vs
*	 - header => headers rename
*  - global.saveToDisk
*  - require icin modul hazirlama, jupyter icin
*  - http2 da server push
*  - kolay workspace ve request olusturucu
*  - sadece o request instance i icin shared data objesi, hooklarin isine yarar
*  - cookie islemleri
*  - etag islemleri
*  - static express sunucusu
*  - hooks.js ekle
*  - file watcher i acip degisimde tree yi yenilemek, Out klasorleri haric
*  - fix arrays for qs and form
*  - requesti dosya olarak vermeden, bulundugun klasorden veya belirtilenden build etme
* */