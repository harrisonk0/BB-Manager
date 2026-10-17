import React from "react";
import Framework7 from "framework7/lite";
import Framework7React, { App } from "framework7-react";
import Tabs from "framework7/components/tabs";
import Sheet from "framework7/components/sheet";
import Searchbar from "framework7/components/searchbar";
import Toggle from "framework7/components/toggle";
import "framework7/css";
import "framework7/components/tabs/css";
import "framework7/components/sheet/css";
import "framework7/components/searchbar/css";
import "framework7/components/toggle/css";

Framework7.use([Framework7React, Tabs, Sheet, Searchbar, Toggle]);
/** Exactly one provider per browser root. Auth boundaries remount only its protected View. */
export function NativeAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <App
      name="BB Manager"
      theme="ios"
      iosTranslucentBars
      className="bb-native-app"
      view={{ iosSwipeBack: false }}
    >
      {children}
    </App>
  );
}
