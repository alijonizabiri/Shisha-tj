using Shisha.Domain.Enums;

namespace Shisha.Application.Designer;

/// <summary>
/// Mirrors the frontend computePanels() pure function exactly.
/// Reference: docs/DesignerLogic.md
/// </summary>
public static class PanelComputer
{
    private const int RailGapMm = 40;
    private const int MaxDoorMm = 800;
    private const int EqualSplitMax = 1600;

    public sealed record Panel(int WidthMm, bool IsDoor, int Position);

    public static IReadOnlyList<Panel> Compute(
        int measureMm,
        int heightMm,
        CabinConfiguration config)
    {
        _ = heightMm; // height is passed to keep signature symmetric with FE; unused here
        var total = measureMm + RailGapMm;

        if (config == CabinConfiguration.TwoGlass)
        {
            int doorMm, fixedMm;
            if (total <= EqualSplitMax)
            {
                doorMm = JsRound((double)total / 2);
                fixedMm = total - doorMm;
            }
            else
            {
                doorMm = MaxDoorMm;
                fixedMm = total - MaxDoorMm;
            }
            return [new Panel(fixedMm, false, 0), new Panel(doorMm, true, 1)];
        }

        // ThreeGlass
        var sideMm = JsRound((double)(total - MaxDoorMm) / 2);
        var otherSideMm = total - MaxDoorMm - sideMm;
        return
        [
            new Panel(sideMm, false, 0),
            new Panel(MaxDoorMm, true, 1),
            new Panel(otherSideMm, false, 2),
        ];
    }

    // Matches JavaScript Math.round() — rounds 0.5 away from zero
    private static int JsRound(double value) =>
        (int)Math.Round(value, MidpointRounding.AwayFromZero);
}
