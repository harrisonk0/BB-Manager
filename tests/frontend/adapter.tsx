import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  NativeAppProvider,
  NativeButton,
  NativeSwitch,
  NativeSearch,
  NativeField,
  NativeInput,
  TaskSheet,
} from "../../components/ui";
import "../../styles/design-system.css";
function AdapterAcceptance() {
  const [blocked, setBlocked] = useState(true),
    [count, setCount] = useState(0),
    [checked, setChecked] = useState(false),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [dynamic, setDynamic] = useState(false),
    [removable, setRemovable] = useState(true);
  return (
    <>
      <main data-bb-app-surface>
        <h1>Adapter acceptance</h1>
        <NativeButton
          disabled={blocked}
          onClick={() => setCount((value) => value + 1)}
        >
          Guarded action
        </NativeButton>
        <button onClick={() => setBlocked((value) => !value)}>
          Toggle disabled
        </button>
        <output aria-label="Activation count">{count}</output>
        <NativeSwitch
          label="Enable notifications"
          checked={checked}
          onChange={setChecked}
        />
        <button onClick={() => setChecked((value) => !value)}>
          External switch update
        </button>
        <output aria-label="Switch state">{String(checked)}</output>
        <NativeSearch
          label="Search fixtures"
          value={query}
          onChange={setQuery}
        />
        <output aria-label="Search value">{query}</output>
        <NativeButton onClick={() => setOpen(true)}>Open task</NativeButton>
        <button
          onClick={() => {
            setBusy(true);
            setOpen(true);
          }}
        >
          Open busy task
        </button>
        <button onClick={() => setDynamic(true)}>Mount open sheet</button>
        <NativeButton aria-label="Open icon task" onClick={() => setOpen(true)}>
          <svg aria-hidden="true" width="24" height="24">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </NativeButton>
        {removable && (
          <button
            onClick={() => {
              setRemovable(false);
              setOpen(true);
            }}
          >
            Open and remove trigger
          </button>
        )}
        <NativeField
          label="Recovery choice"
          error="Choose a recovery option"
          htmlFor="recovery-choice"
        >
          <select id="recovery-choice">
            <option value="">Choose an option</option>
            <option value="passkey">Passkey</option>
          </select>
        </NativeField>
        <NativeInput
          label="Reference"
          hint="Use a synthetic roster reference"
        />
        <button>Background action</button>
      </main>
      <TaskSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Acceptance task"
        dismissible={!busy}
      >
        <button onClick={() => setBusy((value) => !value)}>
          {busy ? "Finish mutation" : "Start mutation"}
        </button>
        <label>
          Task field
          <input name="task" />
        </label>
        <button>Last task action</button>
      </TaskSheet>
      {dynamic && (
        <TaskSheet
          open={true}
          onClose={() => setDynamic(false)}
          title="Mounted open task"
        >
          <button>Mounted task action</button>
        </TaskSheet>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NativeAppProvider>
      <AdapterAcceptance />
    </NativeAppProvider>
  </React.StrictMode>,
);
