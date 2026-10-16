import React, { useState } from "react";
import {
  attendancePercent,
  events,
  formatDate,
  weeks,
  type Member,
  type Role,
  type Section,
} from "./data";
import { Icon } from "./icons";
import { Button, PageTitle, SettingRow, Sheet, Switch } from "./ui";
import bbLogo from "../assets/bb-blue.png";
import companyLogo from "../assets/company.png";
import juniorLogo from "../assets/juniors.png";

interface Props {
  section: Section;
  role: Role;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  solidSurfaces: boolean;
  setSolidSurfaces: (value: boolean) => void;
  onWorkspace: () => void;
  onCalendar: () => void;
  onPrototype: () => void;
  onNotice: (message: string) => void;
  members: Member[];
}
export function Settings({
  section,
  role,
  reducedMotion,
  setReducedMotion,
  solidSurfaces,
  setSolidSurfaces,
  onWorkspace,
  onCalendar,
  onPrototype,
  onNotice,
  members,
}: Props) {
  const [sheet, setSheet] = useState<string | null>(null);
  const [meetingDay, setMeetingDay] = useState("Friday");
  const [appearance, setAppearance] = useState("System");
  return (
    <>
      <PageTitle title="Settings" />
      <section className="list-group workspace-card">
        <button onClick={onWorkspace}>
          <span className="workspace-symbol">
            <Icon name="members" size={26} />
          </span>
          <span>
            <strong>
              {section === "company" ? "Company Section" : "Junior Section"}
            </strong>
            <span>
              {role === "staff"
                ? "Staff workspace"
                : role === "leader"
                  ? "Squad leader"
                  : "Your portal"}
            </span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      </section>
      <div className="settings-layout">
        <div>
          <section className="settings-section">
            <h2>{role === "staff" ? "Section" : "Your Company"}</h2>
            <div className="list-group">
              {role === "staff" ? (
                <>
                  <SettingRow
                    icon="calendar"
                    label="Meeting day"
                    detail={meetingDay}
                    onClick={() => setSheet("meeting")}
                  />
                  <SettingRow
                    icon="members"
                    label="Squads"
                    detail="3"
                    onClick={() => setSheet("squads")}
                  />
                  <SettingRow
                    icon="archive"
                    label="Past sessions"
                    onClick={() => setSheet("archives")}
                  />
                </>
              ) : (
                <SettingRow
                  icon="shield"
                  label="Your account"
                  detail="Active"
                  onClick={() => setSheet("account")}
                />
              )}
              {section === "company" && (
                <SettingRow
                  icon="calendar"
                  label="Calendar & events"
                  onClick={onCalendar}
                />
              )}
            </div>
          </section>
          <section className="settings-section">
            <h2>Your experience</h2>
            <div className="list-group">
              <SettingRow
                icon="sun"
                label="Appearance"
                detail={appearance}
                onClick={() => setSheet("appearance")}
              />
              <SettingRow icon="moon" label="Reduce motion">
                <Switch
                  label="Reduce motion"
                  value={reducedMotion}
                  onChange={setReducedMotion}
                />
              </SettingRow>
              <SettingRow icon="shield" label="Solid navigation">
                <Switch
                  label="Solid navigation"
                  value={solidSurfaces}
                  onChange={setSolidSurfaces}
                />
              </SettingRow>
            </div>
            <p className="group-footnote">
              System motion and contrast preferences are always respected. Solid
              navigation removes transparency.
            </p>
          </section>
        </div>
        <div>
          <section className="settings-section">
            <h2>Account</h2>
            <div className="list-group">
              <SettingRow
                icon="key"
                label="Passkeys"
                onClick={() => setSheet("passkeys")}
              />
              <SettingRow
                icon="bell"
                label="Notifications"
                detail="Not enabled"
                onClick={() => setSheet("notifications")}
              />
              <SettingRow
                icon="logout"
                label="Sign out"
                danger
                onClick={() => setSheet("signout")}
              />
            </div>
          </section>
          <div className="brand-signature">
            <img
              src={bbLogo}
              width="186"
              height="74"
              alt="The Boys’ Brigade · the adventure begins here"
            />
            <p>Designed for your Friday nights.</p>
          </div>
          <button className="prototype-link" onClick={onPrototype}>
            <Icon name="info" size={17} /> About this design prototype
          </button>
        </div>
      </div>
      {sheet === "meeting" && (
        <Sheet title="Meeting day" onClose={() => setSheet(null)}>
          <p className="sheet-intro">The default day for your weekly marks.</p>
          <div className="list-group choice-list">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <button
                key={day}
                aria-pressed={meetingDay === day}
                onClick={() => {
                  setMeetingDay(day);
                  setSheet(null);
                  onNotice("Meeting day updated on this device.");
                }}
              >
                {day}
                {day === meetingDay && <Icon name="check" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "appearance" && (
        <Sheet title="Appearance" onClose={() => setSheet(null)}>
          <p className="sheet-intro">
            Assembly is a light-first design study. The complete System and Dark
            variants need a separate contrast review before migration.
          </p>
          <div className="list-group choice-list">
            {["System", "Light"].map((option) => (
              <button
                key={option}
                aria-pressed={appearance === option}
                onClick={() => {
                  setAppearance(option);
                  setSheet(null);
                }}
              >
                {option}
                {appearance === option && <Icon name="check" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "squads" && (
        <Sheet title="Squads" onClose={() => setSheet(null)}>
          <p className="sheet-intro">Your groups for this BB year.</p>
          <div className="list-group choice-list">
            {["Falcons", "Rangers", "Pioneers"].map((name, index) => (
              <div className="static-setting" key={name}>
                <span>
                  <strong>
                    Squad {index + 1} · {name}
                  </strong>
                  <small>
                    {
                      members.filter((member) => member.squad === index + 1)
                        .length
                    }{" "}
                    members
                  </small>
                </span>
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "archives" && (
        <Sheet title="Past sessions" onClose={() => setSheet(null)}>
          <div className="list-group choice-list">
            <button onClick={() => setSheet("archive-detail")}>
              <span>
                <strong>2025/26</strong>
                <small>Closed 28 August 2026 · 18 members</small>
              </span>
              <Icon name="chevron" />
            </button>
          </div>
          <p className="group-footnote">
            This is a synthetic archive for exploring the design.
          </p>
        </Sheet>
      )}
      {sheet === "archive-detail" && (
        <Sheet title="2025/26" onClose={() => setSheet(null)}>
          <p className="sheet-intro">
            An archived year keeps its own member and marks history.
          </p>
          <div className="list-group choice-list">
            {members.slice(0, 6).map((member) => (
              <div className="static-setting" key={member.id}>
                <span>{member.name}</span>
                <strong>{member.total} marks</strong>
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "passkeys" && (
        <Sheet title="Passkeys" onClose={() => setSheet(null)}>
          <div className="explanation-symbol">
            <Icon name="key" size={32} />
          </div>
          <h3>Fast, secure sign-in</h3>
          <p className="sheet-intro">
            Your passkeys will use this same grouped-list design. This isolated
            prototype does not access accounts or start an authentication
            ceremony.
          </p>
          <Button onClick={() => setSheet(null)}>Done</Button>
        </Sheet>
      )}
      {sheet === "notifications" && (
        <Sheet title="Notifications" onClose={() => setSheet(null)}>
          <div className="explanation-symbol">
            <Icon name="bell" size={32} />
          </div>
          <h3>Keep up with your Company</h3>
          <p className="sheet-intro">
            Event updates can appear here. On iPhone, web push requires an
            installed Home Screen app and your permission. This prototype won’t
            request notification access.
          </p>
          <Button onClick={() => setSheet(null)}>Done</Button>
        </Sheet>
      )}
      {sheet === "account" && (
        <Sheet title="Your account" onClose={() => setSheet(null)}>
          <p className="sheet-intro">
            Alex Morgan ·{" "}
            {role === "leader"
              ? "Squad leader, Falcons"
              : "Company Section member"}
          </p>
          <p>
            Only your role’s information appears in this view. All people and
            records here are invented.
          </p>
        </Sheet>
      )}
      {sheet === "signout" && (
        <Sheet
          title="Leave this preview?"
          onClose={() => setSheet(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setSheet(null)}>
                Stay here
              </Button>
              <Button variant="danger" onClick={() => location.reload()}>
                Reset preview
              </Button>
            </>
          }
        >
          <p className="sheet-intro">
            There is no live account to sign out of. Your prototype changes will
            reset if you reload the page.
          </p>
        </Sheet>
      )}
    </>
  );
}

export function Calendar({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <PageTitle title="Calendar" subtitle="October 2026" />
      <div className="agenda-month">
        <span>October</span>
        <strong>2026</strong>
        <Icon name="calendar" size={26} />
      </div>
      <div className="agenda-list">
        {events.map((event) => (
          <article key={event.id} className="agenda-event">
            <div className="agenda-date">
              <span>{formatDate(event.date, { weekday: "short" })}</span>
              <strong>{formatDate(event.date, { day: "numeric" })}</strong>
            </div>
            <button onClick={() => setSelected(event.id)}>
              <span className="event-kind">{event.kind}</span>
              <strong>{event.title}</strong>
              <span>
                {event.time}
                {event.place ? ` · ${event.place}` : ""}
              </span>
              <Icon name="chevron" size={17} />
            </button>
          </article>
        ))}
      </div>
      <div className="inline-notice">
        <Icon name="info" size={21} />
        <p>Event times are shown in Europe/London.</p>
      </div>
      {selected && (
        <Sheet
          title={events.find((event) => event.id === selected)!.title}
          onClose={() => setSelected(null)}
        >
          <p className="sheet-intro">
            {formatDate(events.find((event) => event.id === selected)!.date)}
          </p>
          <p>{events.find((event) => event.id === selected)!.detail}</p>
          <p className="event-detail-line">
            <Icon name="clock" />
            {events.find((event) => event.id === selected)!.time}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              onNotice(
                "No live calendar subscription is created in the design preview.",
              );
              setSelected(null);
            }}
          >
            Done
          </Button>
        </Sheet>
      )}
    </>
  );
}

export function PortalHome({
  members,
  section,
  onCalendar,
}: {
  members: Member[];
  section: Section;
  onCalendar: () => void;
}) {
  const member = members[0];
  return (
    <>
      <PageTitle title="Hi, Alex" subtitle="Your Company, in one place." />
      <section className="squad-summary personal-summary">
        <p>Your marks this BB year</p>
        <strong className="squad-total">{member.total}</strong>
        <div className="squad-summary-bottom">
          <div>
            <strong>{attendancePercent(member)}%</strong>
            <span>Attendance</span>
          </div>
          <div>
            <strong>Falcons</strong>
            <span>Squad 1</span>
          </div>
        </div>
      </section>
      <section className="list-group next-night">
        <header className="group-heading">
          <h2>Next night</h2>
        </header>
        <button onClick={onCalendar}>
          <span className="setting-icon">
            <Icon name="calendar" />
          </span>
          <span>
            <strong>Company night</strong>
            <span>Friday, 16 October · 19:00</span>
          </span>
          <Icon name="chevron" size={17} />
        </button>
      </section>
      <section className="list-group">
        <header className="group-heading">
          <h2>My weekly marks</h2>
        </header>
        <ul className="personal-history">
          {member.history.map((score, index) => (
            <li key={index}>
              <span>
                {formatDate(weeks[index], { day: "numeric", month: "short" })}
              </span>
              <strong>
                {score === -2
                  ? "Not recorded"
                  : score < 0
                    ? "Absent"
                    : `${score} marks`}
              </strong>
            </li>
          ))}
        </ul>
      </section>
      <p className="section-footnote">
        Your personal progress. Squad leaders have a separate, scoped squad
        view.
      </p>
    </>
  );
}
export { companyLogo, juniorLogo, bbLogo };
