import { json, handle } from '../../../lib/http.js';
export const onRequestGet = handle(async ({ data }) => json({ email: data.admin.email }));
