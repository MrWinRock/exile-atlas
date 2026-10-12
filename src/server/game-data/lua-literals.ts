export type LiteralValue = string | number | boolean | null | { [key:string]:LiteralValue };
export function parseLuaLiterals(source:string):LiteralValue {
 if(new TextEncoder().encode(source).length>10*1024*1024)throw new Error("Source exceeds 10 MiB");
 let at=0;
 const fail=():never=>{throw new Error(`Unsupported literal at offset ${at}`);};
 const skip=()=>{for(;;){while(/\s/.test(source[at]??"")&&at<source.length)at++;if(source.startsWith("--[[",at)){const end=source.indexOf("]]",at+4);if(end<0)fail();at=end+2;}else if(source.startsWith("--",at)){const end=source.indexOf("\n",at);at=end<0?source.length:end+1;}else break;}};
 function value(depth:number):LiteralValue {
  if(depth>32)fail();skip();const ch=source[at];
  if(ch==='"'||ch==="'"){at++;let s="";while(at<source.length){const c=source[at++];if(c===ch)return s;if(c==="\\"){const e=source[at++];if(e==="n")s+="\n";else if(e==="r")s+="\r";else if(e==="t")s+="\t";else if(e===ch||e==="\\")s+=e;else if(e==="\n")s+="\n";else fail();}else s+=c;}return fail();}
  if(source.startsWith("[[",at)){const end=source.indexOf("]]",at+2);if(end<0)fail();const s=source.slice(at+2,end);at=end+2;return s;}
  if(ch==="{"){at++;const obj:Record<string,LiteralValue>=Object.create(null);let index=1;for(;;){skip();if(source[at]==="}"){at++;return obj;}let key:string|undefined;
    if(source[at]==="["){at++;const k=value(depth+1);if(typeof k!=="string"&&typeof k!=="number")fail();skip();if(source[at++]!=="]")fail();skip();if(source[at++]!=="=")fail();key=String(k);}
    else{const named=source.slice(at).match(/^([A-Za-z_]\w*)\s*=/);if(named){key=named[1];at+=named[0].length;}}
    key??=String(index++);if(["__proto__","constructor","prototype"].includes(key)||Object.hasOwn(obj,key))fail();obj[key]=value(depth+1);skip();if(source[at]===","||source[at]===";")at++;else if(source[at]!=="}")fail();
  }}
  const num=source.slice(at).match(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);if(num){at+=num[0].length;const n=Number(num[0]);if(!Number.isFinite(n))fail();return n;}
  for(const [token,v] of [["true",true],["false",false],["nil",null]] as const)if(source.startsWith(token,at)&&!/[A-Za-z0-9_]/.test(source[at+token.length]??"")){at+=token.length;return v;}
  return fail();
 }
 skip();if(source.startsWith("return",at))at+=6;const result=value(0);skip();if(at!==source.length)fail();return result;
}
