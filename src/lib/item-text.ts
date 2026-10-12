export type ItemLine = { text: string; line: number; section: number };
export type ParsedModifier = ItemLine & { originalText:string; actualRolls:number[]; annotations:([number,number]|null)[]; affixType?:"Prefix"|"Suffix"; tier?:string };
export type ParsedItem = { original:string; lines:ItemLine[]; rarity?:string; name?:string; base?:string; itemClass?:string; itemLevel?:number; requiredLevel?:number; requirements:Record<string,number>; properties:Record<string,number>; corrupted:boolean; modifiers:ParsedModifier[]; unknownLines:ItemLine[] };
export function parseItemText(text:string):ParsedItem {
  if(new TextEncoder().encode(text).length>65536) throw new Error("Item text must be at most 64 KiB.");
  const item:ParsedItem={original:text,lines:[],requirements:{},properties:{},corrupted:false,modifiers:[],unknownLines:[]};
  let section=0, rarityLine=-1, requirements=false;
  let annotation:{affixType?:"Prefix"|"Suffix";tier?:string}={};
  const propertyKeys:Record<string,string>={Quality:"quality",Sockets:"sockets","Attacks per Second":"attackRate","Item Rarity":"itemRarity","Waystone Tier":"waystoneTier",Armour:"armour","Energy Shield":"energyShield","Evasion Rating":"evasion",Spirit:"spirit","Critical Hit Chance":"criticalChance","Chance to Block":"blockChance"};
  text.replaceAll("\r\n","\n").split("\n").forEach((raw,line)=>{
    const value=raw.trim();const entry={text:raw,line,section};item.lines.push(entry);
    if(/^--------+$/.test(value)){section++;requirements=false;annotation={};return;}
    if(!value) return;
    if(value==="Requirements:"){requirements=true;return;}
    if(value==="Corrupted"){item.corrupted=true;return;}
    const pair=value.match(/^([^:]+):\s*(.*)$/);
    if(pair){const [,key,content]=pair; const numeric=content.match(/[+-]?\d+(?:\.\d+)?/);const n=numeric?Number(numeric[0]):undefined;
      if(key==="Item Class"){item.itemClass=content;return;}
      if(key==="Rarity"){item.rarity=content;rarityLine=line;return;}
      if(key==="Item Level"&&n!==undefined){item.itemLevel=n;return;}
      if(requirements&&n!==undefined){item.requirements[key]=n;if(key==="Level")item.requiredLevel=n;return;}
      if(propertyKeys[key]&&n!==undefined){item.properties[propertyKeys[key]]=n;return;}
    }
    if(rarityLine>=0&&section===0&&line>rarityLine){if(!item.name)item.name=value;else if(!item.base)item.base=value;else item.unknownLines.push(entry);return;}
    const affix=value.match(/^\{.*\b(Prefix|Suffix)\b.*(?:Tier:\s*([^}" ]+))?.*\}$/i);
    if(affix){annotation={affixType:affix[1].toLowerCase()==="prefix"?"Prefix":"Suffix",tier:value.match(/Tier:\s*(\d+)/i)?.[1]};return;}
    if(value.startsWith("{")||value.startsWith("(")){item.unknownLines.push(entry);return;}
    const annotations:([number,number]|null)[]=[]; const rolls:number[]=[];
    const normalized=value.replace(/([+-]?\d+(?:\.\d+)?)(?:\(([+-]?\d+(?:\.\d+)?)-([+-]?\d+(?:\.\d+)?)\))?/g,(_,actual,a,b)=>{rolls.push(Number(actual));annotations.push(a===undefined?null:[Number(a),Number(b)]);return actual;});
    const modifier={...entry,text:normalized,originalText:raw,actualRolls:rolls,annotations,...annotation};item.modifiers.push(modifier);
    if(!rolls.length&&!/\b(increased|reduced|cannot|immune|ground|chance|gain|deal|grant)\b/i.test(value))item.unknownLines.push(entry);
  });
  return item;
}
