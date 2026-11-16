import asyncHandler from "../utils/asyncHandler.js";
import {
  exportInventoryLogsCsv,
  listInventoryLogs,
} from "../services/inventory.service.js";

export const adminGetInventoryLogs = asyncHandler(async (req, res) => {
  const result = await listInventoryLogs(req.query);
  res.json({ data: result });
});

export const adminExportInventoryLogs = asyncHandler(async (req, res) => {
  const csv = await exportInventoryLogsCsv(req.query);
  const stamp = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="inventory-${stamp}.csv"`);
  res.send(csv);
});