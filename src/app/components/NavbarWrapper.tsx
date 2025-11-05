"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const [padding, setPadding] = useState("");

  useEffect(() => {
    if (pathname === "/") {
      setPadding("");
    } else {
      setPadding("pt-20"); // push content below navbar
    }
  }, [pathname]);

  return (
    <>
      <Navbar />
      <div className={padding} />
    </>
  );
}
