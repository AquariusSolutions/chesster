import { Drawer } from "expo-router/drawer";

import DrawerContent from "@/components/drawer-content";

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
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
