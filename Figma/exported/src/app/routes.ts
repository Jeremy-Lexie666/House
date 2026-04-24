import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { WatchManagePage } from "./pages/WatchManagePage";
import { WatchFormPage } from "./pages/WatchFormPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/property/:id",
    Component: PropertyDetailPage,
  },
  {
    path: "/watch",
    Component: WatchManagePage,
  },
  {
    path: "/watch/add",
    Component: WatchFormPage,
  },
  {
    path: "/watch/edit/:id",
    Component: WatchFormPage,
  },
]);
