import { appendFileSync, readdirSync, statSync } from "fs";
import { extname, join } from "path";
import { RequestIdGen } from "./Utils/IdGen";
import { reqUncached } from "./Utils/Require";


export enum FileTypes {
	js = "js",
	json = "json",
	binary = "binary",
	xml = "xml"
}

export const AcceptedResources = [
	"body",
	"context",
	"request",
	"headers",
	"query",
	"hooks",
];

export interface IResource<ModuleT = any> {
	path: string;
	fileName: string;
	type: FileTypes;
	idendifier: string;
	uniqueName: string;
	resourceType: string;
	module?: ModuleT;
}

export interface INode {
	path: string;
	parent?: INode;
	children: INode[];
	resources: {
		[rtype: string]: Record<string, IResource[]>
	}
	context: Record<string, any>
}


/*
request id tasidigi icin requestin yeri ile ilgili islemlerde
tree nin degisimi onemli degil, gerektiginde lookup yapilir.

tree de degisim olursa context yenilenmeli
* */

export class Tree {
	static Root: INode;
	static AllNodes: Record<string, INode> = {};

	static CreateResource(fileName: string, filePath: string) {
		const parts = fileName.split(".");
		const ext = parts.pop() || "";
		const type = parts.pop() || "";
		let idendifier = parts.pop() || "default";
		if (idendifier === "def") {
			idendifier = "default";
		}
		const uniqueName = parts.join("");
		if (!(AcceptedResources.includes(type))) {
			return;
		}
		const resource: IResource = {
			fileName: fileName,
			path: filePath,
			type: ext as FileTypes,
			resourceType: type,
			idendifier,
			uniqueName,
		};
		if (!(ext in FileTypes)) {
			resource.type = FileTypes.binary;
		}
		return resource;
	}

	static Find(fn: (node: INode) => boolean, node: INode = this.Root): INode[] {
		if (fn(node)) {
			return [node];
		} else {
			const arr = [];
			for (const child of node.children) {
				const result = this.Find(fn, child);
				if (result) {
					arr.push(...result);
				}
			}
			return arr;
		}
	}


	static async CreateNode(Path: string, Parent?: INode): Promise<INode> {
		const node: INode = {
			path: Path,
			parent: Parent,
			children: [],
			resources: {
				context: {},
				headers: {},
				request: {},
				query: {},
				body: {},
			},
			context: Parent ? { ...Parent.context } : {},
		};
		const fns: Function[] = [];
		const files = readdirSync(Path);
		for (const file of files) {
			const filePath = join(Path, file);
			if (statSync(filePath).isDirectory()) {
				if (file === "Out" || file.startsWith(".") || extname(file)
					=== "disabled") {
					continue;
				}
				fns.push(async () => {
					const cnode = await this.CreateNode(filePath, node);
					node.children.push(cnode);
				});
			} else {
				const res = this.CreateResource(file, filePath);
				if (res) {
					if (!node.resources[res.resourceType]) {
						node.resources[res.resourceType] = {};
					}
					if (!node.resources[res.resourceType][res.idendifier]) {
						node.resources[res.resourceType][res.idendifier] = [];
					}
					node.resources[res.resourceType][res.idendifier].push(res);
				}
			}
		}

		for (const res of this.ResourceArray(node, "request")) {
			let module: { ID?: string } = reqUncached(res.path);
			if (!module.ID) {
				appendFileSync(
					res.path,
					`\nmodule.exports.ID = "${RequestIdGen()}";\n`,
				);
				module = reqUncached(res.path);
			}
			res.module = module;
		}
		for (const res of this.ResourceArray(node, "context")) {
			const module = reqUncached(res.path);
			await module(node.context, Parent ? Parent.context : {});
		}


		this.AllNodes[node.path] = node;
		await Promise.all(fns.map(f => f()));
		return node;
	}

	static ResExists(
		node: INode,
		resName: string,
		ident: string,
	) {
		if (!node.resources[resName]) {
			return false;
		}
		if (!node.resources[resName][ident]) {
			return false;
		}
		return node.resources[resName][ident].length > 0;
	}

	static ResourceArray(node: INode, resName: string) {
		const resources = node.resources[resName];
		const acc: IResource[] = [];
		for (const ident in resources) {
			for (const res of resources[ident]) {
				acc.push(res);
			}
		}
		return acc;
	}

	static* ResourcesFrom(node: INode, resName: string) {
		while (true) {
			const resources = node.resources[resName];
			for (const ident in resources) {
				for (const res of resources[ident]) {
					yield res;
				}
			}
			if (!node.parent) {
				break;
			}
			node = node.parent;
		}
	}

	static* ResourcesTo(node: INode, resName: string) {
		const acc: IResource[] = [];
		while (true) {
			const resources = node.resources[resName];
			for (const ident in resources) {
				for (const res of resources[ident]) {
					acc.unshift(res);
				}
			}
			if (!node.parent) {
				break;
			}
			node = node.parent;
		}
		for (const res of acc) {
			yield res;
		}
	}

	static async MergeJsonResource(
		node: INode,
		resName: string,
		ident: string,
		extractFn: (r: IResource) => Record<string, any>,
	) {
		if (!node.resources[resName]) {
			return;
		}
		if (!node.resources[resName][ident]) {
			return;
		}
		const Arr = node.resources[resName][ident];
		const Obj = {} as Record<string, any>;
		await Promise.all(Arr.map(async r => {
			return Object.assign(Obj, await extractFn(r));
		}));
		return Obj;
	}


	static async Build() {
		//wathcer i kapat
		this.Root = await this.CreateNode(global.Ex.Root);
		//watcher i ac
	}

}