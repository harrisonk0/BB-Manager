import type { Page, Route } from "@playwright/test";
import type { Section, UserRole } from "../../../types";
import type { MemberRow, MarkRow } from "../../../services/dbModel";

/** Network fixture only. This is never imported by the shipped application. */
export async function installSyntheticBackend(
  page: Page,
  options: {
    count?: number;
    section?: Section;
    role?: UserRole;
    leader?: boolean;
    signedOut?: boolean;
    archiveError?: boolean;
    archived?: boolean;
  } = {},
) {
  const section = options.section ?? "company";
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "synthetic@example.invalid",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const members: MemberRow[] = Array.from(
    { length: options.count ?? 30 },
    (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
      name:
        index === 0
          ? "Alexander Montgomery-Worthington"
          : `Synthetic Member ${String(index + 1).padStart(3, "0")}`,
      section,
      squad: (index % (section === "company" ? 3 : 4)) + 1,
      school_year:
        section === "company"
          ? String(11 + (index % 4))
          : ["P4", "P5", "P6", "P7"][index % 4],
      is_squad_leader: index < 3,
      rank: section === "company" && index === 0 ? "corporal" : null,
    }),
  );
  const marks: MarkRow[] = members.flatMap((member, index) =>
    ["2026-09-04", "2026-09-11", "2026-09-18"].map((date, week) => ({
      id: `${member.id}-${date}`,
      member_id: member.id,
      section,
      date,
      score: index % 7 === week ? null : section === "company" ? 7.5 : 12.5,
      uniform_score: section === "junior" ? 8 : null,
      behaviour_score: section === "junior" ? 4.5 : null,
      present: index % 7 !== week,
    })),
  );
  const state = {
    members,
    marks,
    requests: [] as {
      method: string;
      path: string;
      query: string;
      body: unknown;
    }[],
    unexpected: [] as string[],
    failSaves: false,
    signedOut: false,
    failArchives: Boolean(options.archiveError),
    failArchivedMembers: false,
  };
  const settingsBySection = Object.fromEntries(
    (["company", "junior"] as const).map((section) => [
      section,
      {
        section,
        meeting_day: 5,
        squads: Array.from(
          { length: section === "company" ? 3 : 4 },
          (_, index) => ({ number: index + 1, label: null }),
        ),
      },
    ]),
  );
  const reply = (route: Route, value: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
      },
      body: JSON.stringify(value),
    });
  await page.addInitScript(
    ({ user, section, signedOut }) => {
      if (sessionStorage.getItem("synthetic-fixture-seeded")) return;
      sessionStorage.setItem("synthetic-fixture-seeded", "1");
      if (signedOut) return;
      // Synthetic expiry is fixed so screenshot clock installation cannot expire it.
      const expiresAt = 4102444800; // 2100-01-01, in-memory fake session only.
      const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, aud: "authenticated", role: "authenticated", exp: expiresAt }))}.synthetic-only`;
      localStorage.setItem(
        "sb-example-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "synthetic-only",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: expiresAt,
          user,
        }),
      );
      localStorage.setItem("activeSection", section);
      sessionStorage.setItem("bb-passkey-nudge-dismissed", "1");
    },
    { user, section, signedOut: options.signedOut },
  );
  let localOrigin: string | null = null;
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (["127.0.0.1", "localhost"].includes(url.hostname)) {
      localOrigin ??= url.origin;
      if (url.origin === localOrigin) return route.continue();
      state.unexpected.push(request.url());
      return route.abort("blockedbyclient");
    }
    if (url.hostname !== "example.supabase.co") {
      state.unexpected.push(request.url());
      return route.abort("blockedbyclient");
    }
    if (request.method() === "OPTIONS") return reply(route, {});
    const path = url.pathname;
    const body = request.postDataJSON();
    state.requests.push({
      method: request.method(),
      path,
      query: url.search,
      body,
    });
    if (path === "/auth/v1/token") {
      if (
        body?.email !== "synthetic@example.invalid" ||
        body?.password !== "synthetic-password"
      )
        return reply(
          route,
          {
            code: "invalid_credentials",
            msg: "Synthetic credentials are invalid",
            error_description: "Synthetic credentials are invalid",
          },
          400,
        );
      const encode = (value: unknown) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const access_token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", exp: 4102444800 })}.synthetic-only`;
      state.signedOut = false;
      return reply(route, {
        access_token,
        refresh_token: "synthetic-only",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 4102444800,
        user,
      });
    }
    if (path === "/auth/v1/recover") return reply(route, {});
    if (path === "/auth/v1/user")
      return reply(route, state.signedOut ? null : user);
    if (path === "/auth/v1/logout") {
      state.signedOut = true;
      return reply(route, {});
    }
    if (path.includes("/passkeys")) return reply(route, []);
    if (path === "/rest/v1/profiles")
      return reply(
        route,
        options.role === "boy" ? null : { role: options.role ?? "captain" },
      );
    if (path === "/rest/v1/settings") {
      const requested = (url.searchParams
        .get("section")
        ?.replace(/^eq\./, "") ?? section) as Section;
      const settings = settingsBySection[requested];
      if (request.method() === "PATCH") Object.assign(settings, body);
      return reply(route, settings);
    }
    if (path === "/rest/v1/members") {
      if (request.method() === "POST") {
        const row = {
          ...(Array.isArray(body) ? body[0] : body),
          id: crypto.randomUUID(),
        };
        state.members.push(row);
        return reply(route, row, 201);
      }
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      if (request.method() === "DELETE") {
        state.members = state.members.filter((member) => member.id !== id);
        return reply(route, null);
      }
      if (request.method() === "PATCH") {
        const row = state.members.find((member) => member.id === id);
        Object.assign(row ?? {}, body);
        return reply(route, row);
      }
      const requested = url.searchParams.get("section")?.replace(/^eq\./, "");
      const rows = state.members.filter(
        (member) => !requested || member.section === requested,
      );
      return reply(
        route,
        id ? (rows.find((member) => member.id === id) ?? null) : rows,
      );
    }
    if (path === "/rest/v1/marks") {
      if (request.method() !== "GET" && state.failSaves)
        return reply(
          route,
          { message: "Synthetic save unavailable", code: "P0001" },
          503,
        );
      return reply(
        route,
        state.marks.filter(
          (mark) =>
            !url.searchParams.has("member_id") ||
            mark.member_id ===
              url.searchParams.get("member_id")?.replace(/^eq\./, ""),
        ),
      );
    }
    if (path === "/rest/v1/rpc/save_member_marks_patch") {
      if (state.failSaves)
        return reply(
          route,
          { message: "Synthetic member save unavailable" },
          400,
        );
      state.marks = state.marks.filter(
        (mark) =>
          !(
            mark.member_id === body.p_member_id &&
            body.p_delete_dates.includes(mark.date)
          ),
      );
      for (const row of body.p_upsert_rows) {
        state.marks = state.marks.filter(
          (mark) =>
            !(mark.member_id === body.p_member_id && mark.date === row.date),
        );
        state.marks.push({
          id: crypto.randomUUID(),
          member_id: body.p_member_id,
          ...row,
        });
      }
      return reply(route, null);
    }
    if (path === "/rest/v1/rpc/save_weekly_marks_snapshot") {
      if (state.failSaves)
        return reply(
          route,
          { message: "Synthetic save unavailable", code: "P0001" },
          503,
        );
      for (const entry of body.p_snapshot) {
        state.marks = state.marks.filter(
          (mark) =>
            !(
              mark.member_id === entry.member_id &&
              mark.date === body.p_meeting_date
            ),
        );
        if (entry.mark)
          state.marks.push({
            id: crypto.randomUUID(),
            member_id: entry.member_id,
            ...entry.mark,
          });
      }
      return reply(route, null);
    }
    if (path === "/rest/v1/bb_sessions" && state.failArchives)
      return reply(route, { message: "Synthetic archive unavailable" }, 400);
    if (path === "/rest/v1/bb_sessions")
      return reply(route, [
        {
          id: "synthetic-session",
          label: "2025–26",
          closed_at: "2026-06-01T18:00:00Z",
          closed_by_email: "synthetic@example.invalid",
          member_count: members.length,
          mark_count: marks.length,
        },
      ]);
    if (path === "/rest/v1/portal_accounts") {
      const account = {
        member_id: members[0].id,
        user_id: user.id,
        username: "synthetic.alex",
        activated_at: "2026-09-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
      };
      return reply(
        route,
        url.searchParams.has("user_id") ? account : [account],
      );
    }
    if (path === "/rest/v1/rpc/company_portal_summary") {
      const dated = [
        { date: "2026-09-18", score: 0 },
        { date: "2026-09-11", score: -1 },
        { date: "2026-09-04", score: 7.5 },
      ];
      return reply(route, {
        name: members[0].name,
        squad: 1,
        isSquadLeader: options.leader ?? false,
        memberRank: "corporal",
        total: 7.5,
        attended: 2,
        recorded: 3,
        companyRank: 1,
        squadRank: 1,
        marks: dated,
        teammates: [{ name: "Synthetic Teammate", isSquadLeader: false }],
        squadMembers: options.leader
          ? [
              {
                id: members[0].id,
                name: members[0].name,
                isSquadLeader: true,
                memberRank: "corporal",
                marks: dated,
              },
            ]
          : null,
        squads: [
          { number: 1, label: "Eagles", total: 7.5, attended: 2, recorded: 3 },
          { number: 2, label: null, total: 5, attended: 1, recorded: 1 },
        ],
      });
    }
    if (path === "/rest/v1/company_events")
      return reply(route, [
        {
          id: "synthetic-event",
          title: "Company night",
          starts_at: "2027-01-08T19:00:00Z",
          ends_at: "2027-01-08T21:00:00Z",
          location: "Synthetic BB Hall",
          details: "Uniform inspection and activities",
          cancelled: false,
          revision: 1,
          updated_at: "2026-10-01T00:00:00Z",
          meeting_date: "2027-01-08",
          created_at: "2026-10-01T00:00:00Z",
        },
      ]);
    if (path === "/rest/v1/archived_members" && state.failArchivedMembers)
      return reply(
        route,
        { message: "Synthetic archived members unavailable" },
        503,
      );
    if (path === "/rest/v1/archived_members")
      return reply(
        route,
        options.archived
          ? [
              {
                id: "00000000-0000-4000-8000-000000009999",
                session_id: "synthetic-session",
                source_member_id: "synthetic-previous",
                name: "Returning Synthetic",
                squad: 1,
                section,
                school_year: section === "company" ? "11" : "P5",
                is_squad_leader: false,
                rank: section === "company" ? "corporal" : null,
              },
            ]
          : [],
      );
    if (path === "/rest/v1/archived_marks") return reply(route, []);
    if (path === "/rest/v1/company_calendar_settings")
      return reply(route, {
        id: true,
        starts_on: "2026-09-01",
        ends_on: "2027-06-30",
        starts_at: "19:00:00",
        ends_at: "21:00:00",
        location: "Synthetic BB Hall",
        timezone: "Europe/London",
      });
    if (path === "/rest/v1/rpc/start_new_bb_session") {
      const result = {
        id: "synthetic-closed-session",
        label: body.p_label,
        member_count: state.members.length,
        mark_count: state.marks.length,
        closed_at: "2026-10-17T12:00:00Z",
      };
      state.members = [];
      state.marks = [];
      return reply(route, result);
    }
    if (path === "/rest/v1/rpc/save_company_event")
      return reply(route, { id: body.p_id ?? "synthetic-new-event" });
    if (path === "/rest/v1/rpc/generate_company_nights") return reply(route, 4);
    if (path === "/functions/v1/company-portal" && body?.action === "provision")
      return reply(route, {
        memberId: body.memberId,
        username: "synthetic.new",
        code: "SYNTHETIC-NOT-REAL",
        link: "https://example.invalid/?username=synthetic.new&code=SYNTHETIC-NOT-REAL",
      });
    if (path === "/functions/v1/company-portal" && body?.action === "feed")
      return reply(route, {
        url: "https://example.invalid/synthetic-feed.ics",
      });
    state.unexpected.push(`${request.method()} ${path}`);
    return reply(route, { message: "Unimplemented synthetic endpoint" }, 501);
  });
  return state;
}
