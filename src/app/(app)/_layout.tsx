import { Drawer } from "expo-router/drawer";

import DrawerContent from "@/components/drawer-content";
import { useTheme } from "@/hooks/use-theme";

export default function AppLayout() {
  const theme = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        // Header buttons (the drawer/hamburger icon) default to iOS system
        // blue — tint them with the theme text color instead.
        headerTintColor: theme.text,
        drawerActiveTintColor: theme.text,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Chesster",
          headerShown: true,
          headerShadowVisible: false,
          headerTitleAlign: "center",
        }}
      />
      <Drawer.Screen
        name="history"
        options={{ title: "History", headerShown: true }}
      />
      <Drawer.Screen
        name="profile"
        options={{ title: "Profile", headerShown: true }}
      />
      {/* Starter screen — keep routable but off the drawer. */}
      <Drawer.Screen
        name="explore"
        options={{ drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
  );
}
