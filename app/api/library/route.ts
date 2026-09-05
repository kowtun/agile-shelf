import {getLibrary} from '@/lib/library';
export async function GET(){try{return Response.json(await getLibrary(),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'The library is temporarily unavailable.'},{status:503});}}
