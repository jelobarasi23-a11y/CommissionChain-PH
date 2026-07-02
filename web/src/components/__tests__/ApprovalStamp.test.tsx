import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApprovalStamp } from "../ApprovalStamp";

describe("ApprovalStamp", () => {
  it("renders the correct label for each status", () => {
    const { rerender } = render(<ApprovalStamp status="PENDING" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();

    rerender(<ApprovalStamp status="APPROVED" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();

    rerender(<ApprovalStamp status="REJECTED" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();

    rerender(<ApprovalStamp status="CLAIMED" />);
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("exposes an accessible label describing the status", () => {
    render(<ApprovalStamp status="APPROVED" />);
    expect(screen.getByLabelText("Status: Approved")).toBeInTheDocument();
  });

  it("applies the small-size class when size='sm' is passed", () => {
    render(<ApprovalStamp status="CLAIMED" size="sm" />);
    const stamp = screen.getByText("Settled");
    expect(stamp.className).toContain("stamp-sm");
  });

  it("does not apply the small-size class by default", () => {
    render(<ApprovalStamp status="CLAIMED" />);
    const stamp = screen.getByText("Settled");
    expect(stamp.className).not.toContain("stamp-sm");
  });
});
