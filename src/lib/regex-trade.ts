import { REGEX_MODIFIERS, REGEX_PROPERTIES } from "./regex-catalogue";
import { compileRegexSearch, hasRegexValue, rangeBounds } from "./regex-search";
import type { ModifierSelection, RegexDraft } from "./regex-schema";
import { createTradeDraft, validateTradeDraft, type TradeDraft, type TradeStatFilter } from "./trade-search";
export function prepareRegexTrade(input:RegexDraft,league:string):{draft:TradeDraft;supported:string[];unsupported:string[];errors:string[];ready:boolean} {
  const draft=createTradeDraft(),supported:string[]=[],unsupported:string[]=[];
  const compiled=compileRegexSearch(input);const errors=[...compiled.errors];
  draft.league=league.trim();
  draft.statGroups=[];
  const category={waystone:"map.waystone",tablet:"map.tablet",relic:"sanctum.relic",vendor:"",equipment:""}[input.category];
  if(category)draft.fields["type_filters.category"]=category;
  const mapped=(selection:ModifierSelection):TradeStatFilter|undefined=>{
    const m=REGEX_MODIFIERS.find(m=>m.id===selection.id&&m.categories.includes(input.category));
    if(!m?.tradeStatId){unsupported.push(m?.label??selection.id);return;}
    supported.push(m.label);
    let min=selection.min.trim(),max=selection.max.trim();
    if(m.numericDomain&&hasRegexValue(selection)){
      try{const bounds=rangeBounds(selection,m.numericDomain,m.label);min=String(bounds[0]);max=String(bounds[1]);}catch{return;}
    }
    return {id:m.tradeStatId,label:m.label,min,max,disabled:false};
  };
  const dedupe=(filters:TradeStatFilter[])=>[...new Map(filters.map(f=>[`${f.id}:${f.min}:${f.max}`,f])).values()];
  const wanted=dedupe(input.wanted.map(mapped).filter((f):f is TradeStatFilter=>!!f));
  if(wanted.length)draft.statGroups.push({id:"regex-wanted",type:input.match==="any"?"or":"and",min:"",max:"",disabled:false,filters:wanted});
  input.unwanted.forEach((selection,index)=>{const f=mapped(selection);if(f)draft.statGroups.push({id:`regex-not-${index}`,type:"not",min:"",max:"",disabled:false,filters:[f]});});
  for(const [id,value]of Object.entries(input.properties)){
    if(!hasRegexValue(value))continue;
    const p=REGEX_PROPERTIES.find(p=>p.id===id&&p.categories.includes(input.category));
    if(!p?.tradeField){unsupported.push(p?.label??id);continue;}
    supported.push(p.label);
    if(p.kind==="range"&&typeof value!=="string"){
      try{const bounds=rangeBounds(value,p.numericDomain!,p.label);draft.fields[p.tradeField]={min:String(bounds[0]),max:String(bounds[1])};}catch{/* Compiler already reports invalid bounds. */}
    }else draft.fields[p.tradeField]=typeof value==="string"?value:"";
  }
  if(input.text.trim())unsupported.push("Additional text");
  if(!compiled.text)errors.push("Configure at least one search criterion.");
  errors.push(...validateTradeDraft(draft));
  return {draft,supported:[...new Set(supported)],unsupported:[...new Set(unsupported)],errors:[...new Set(errors)],ready:errors.length===0&&unsupported.length===0};
}
