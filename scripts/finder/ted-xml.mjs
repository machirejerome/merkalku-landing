import { spawn } from 'node:child_process';

// Existing Python3+lxml is an explicit CLI prerequisite; never install at runtime.
// Input stays on stdin, XML is never persisted, and only allowlisted public facts leave the parser.
const PYTHON = String.raw`
import sys,json
from lxml import etree
raw=sys.stdin.buffer.read(2000001)
if len(raw)>2000000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper(): raise ValueError('unsafe_xml')
p=etree.XMLParser(resolve_entities=False,load_dtd=False,no_network=True,recover=False,huge_tree=False)
r=etree.fromstring(raw,p)
if r.getroottree().docinfo.doctype: raise ValueError('unsafe_xml')
ns={'cac':'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2','cbc':'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2','efac':'http://data.europa.eu/p27/eforms-ubl-extension-aggregate-components/1','efbc':'http://data.europa.eu/p27/eforms-ubl-extension-basic-components/1'}
if r.tag!='{urn:oasis:names:specification:ubl:schema:xsd:ContractNotice-2}ContractNotice': raise ValueError('unsupported_xml_root')
def texts(node,path):
 return [''.join(e.itertext()).strip() for e in node.findall(path,ns)]
def one(node,path):
 vals=texts(node,path)
 if len(vals)!=1 or not vals[0]: raise ValueError('missing_or_ambiguous_xml_field')
 return vals[0]
def title(node):
 vals=node.findall('cac:ProcurementProject/cbc:Name',ns)
 de=[v for v in vals if v.get('languageID') in ('DEU','deu','de','DE')]
 chosen=de if de else vals
 if len(chosen)!=1: raise ValueError('ambiguous_title')
 return ''.join(chosen[0].itertext()).strip()
notice=r.findall('cbc:NoticeTypeCode',ns)
if len(notice)!=1: raise ValueError('ambiguous_notice_type')
lots=[]
for lot in r.findall('cac:ProcurementProjectLot',ns):
 locs=[]
 for loc in lot.findall('cac:ProcurementProject/cac:RealizedLocation',ns):
  locs.append({'postcode':one(loc,'cac:Address/cbc:PostalZone'),'city':one(loc,'cac:Address/cbc:CityName'),'country':one(loc,'cac:Address/cac:Country/cbc:IdentificationCode')})
 cpv_nodes=lot.findall('cac:ProcurementProject/cac:MainCommodityClassification/cbc:ItemClassificationCode',ns)
 if len(cpv_nodes)!=1 or cpv_nodes[0].get('listName')!='cpv': raise ValueError('ambiguous_cpv')
 lots.append({'id':one(lot,'cbc:ID'),'title':title(lot),'cpv':cpv_nodes[0].text.strip(),'locations':locs,'tenderDates':texts(lot,'cac:TenderingProcess/cac:TenderSubmissionDeadlinePeriod/cbc:EndDate'),'tenderTimes':texts(lot,'cac:TenderingProcess/cac:TenderSubmissionDeadlinePeriod/cbc:EndTime'),'requestDates':texts(lot,'cac:TenderingProcess/cac:ParticipationRequestReceptionPeriod/cbc:EndDate'),'requestTimes':texts(lot,'cac:TenderingProcess/cac:ParticipationRequestReceptionPeriod/cbc:EndTime')})
danger={'ChangedNoticeIdentifier','Change','Changes','NoticeResult','LotResult','WinnerSelectionStatusCode','NonAwardJustificationCode','ProcedureTerminationIndicator','ProcedureRelaunchIndicator'}
has_danger=any(etree.QName(e).namespace in (ns['efac'],ns['efbc'],ns['cac'],ns['cbc']) and etree.QName(e).localname in danger and (etree.QName(e).localname not in ('ProcedureTerminationIndicator','ProcedureRelaunchIndicator') or (e.text or '').strip()!='false') for e in r.iter() if isinstance(e.tag,str))
print(json.dumps({'noticeIdentifier':one(r,'cbc:ID'),'version':one(r,'cbc:VersionID'),'procedureIdentifier':one(r,'cbc:ContractFolderID'),'formType':notice[0].get('listName'),'noticeType':notice[0].text.strip(),'procedureType':one(r,'cac:TenderingProcess/cbc:ProcedureCode'),'rootType':'ContractNotice','hasChangeOrClosure':has_danger,'lots':lots},ensure_ascii=False))
`;

export function parseTedXml(xml, { python = 'python3', timeoutMs = 10000, signal } = {}) {
  if (signal?.aborted) return Promise.reject(new Error('run_budget_exceeded'));
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) return Promise.reject(new Error('unsafe_xml'));
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-c', PYTHON], { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH, LANG: 'en_US.UTF-8' } });
    let output = '', settled = false;
    const finish = (error, data) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', aborted); if (error) { child.kill('SIGKILL'); reject(error); } else resolve(data); };
    const aborted = () => finish(new Error('run_budget_exceeded'));
    const timer = setTimeout(() => finish(new Error('xml_parser_timeout')), timeoutMs);
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();
    child.on('error', () => finish(new Error('python3_lxml_required')));
    child.stdin.on('error', () => finish(new Error('xml_parser_failed')));
    child.stdout.on('data', (part) => { output += part.toString('utf8'); if (Buffer.byteLength(output) > 200_000) finish(new Error('xml_projection_too_large')); });
    // Never echo Python diagnostics: they may include original notice content.
    child.stderr.resume();
    child.on('close', (code) => { if (code !== 0) return finish(new Error('xml_parser_failed_or_lxml_missing')); try { finish(null, JSON.parse(output)); } catch { finish(new Error('invalid_xml_projection')); } });
    child.stdin.end(xml);
  });
}
