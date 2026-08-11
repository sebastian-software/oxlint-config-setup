import { screen } from "@testing-library/react";

async function verify() {
  screen.findByRole("button");
}

void verify();
