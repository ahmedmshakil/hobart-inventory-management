import {
  Beef,
  Boxes,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Slice,
  Store,
  Trash2,
  Truck,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Beef;
  short: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, short: "Live production & sales" },
      { href: "/reports", label: "Reports", icon: FileBarChart, short: "Build & export reports" },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/intake", label: "Livestock Intake", icon: Truck, short: "Animals received" },
      { href: "/processing", label: "Processing Runs", icon: Slice, short: "Boning room output" },
      { href: "/inventory", label: "Inventory", icon: Boxes, short: "Cuts in the cold rooms" },
      { href: "/wastage", label: "Wastage & Trim", icon: Trash2, short: "Yield loss tracking" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart, short: "Restaurant orders" },
      { href: "/customers", label: "Customers", icon: Store, short: "Wholesale accounts" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/products", label: "Cuts & Products", icon: Beef, short: "Product catalogue" },
      { href: "/suppliers", label: "Suppliers", icon: ClipboardList, short: "Farms & abattoirs" },
      { href: "/settings", label: "Settings", icon: Settings, short: "Company & data" },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);
