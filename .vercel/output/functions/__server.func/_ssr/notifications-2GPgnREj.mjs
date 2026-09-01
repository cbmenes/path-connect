import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-2GPgnREj.js
async function insertNotification(sql, input) {
	await sql`
    insert into notifications (
      id, user_id, kind, title, body, job_id, client_id, client_name, requested_start_at, status
    ) values (
      ${nid("ntf")}, ${input.userId}, ${input.kind}, ${input.title}, ${input.body ?? null},
      ${input.jobId ?? null}, ${input.clientId ?? null}, ${input.clientName ?? null},
      ${input.requestedStartAt ?? null}, ${"unread"}
    )
  `;
}
var listNotifications = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("e60ba51f4e4938930a0f25b4300485e9b69251c9b6d8ef1ba5e2ade9da881f9d"));
var markNotificationsRead = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input ?? {}).handler(createSsrRpc("e53e8b6a2ee5f776341104e06d09eadf51468d3723b1b6c8a245d06bd68522b9"));
var handleNotification = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("315bed82600e29e2cb9cd11f5c218a46deda5ae6489ecc2dc66645f9da89d999"));
//#endregion
export { markNotificationsRead as i, insertNotification as n, listNotifications as r, handleNotification as t };
