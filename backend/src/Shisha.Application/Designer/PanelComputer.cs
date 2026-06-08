namespace Shisha.Application.Designer;

/// <summary>
/// Mirrors the frontend computeInitialPanels() pure function exactly.
/// Reference: docs/DesignerLogic.md
/// </summary>
public static class PanelComputer
{
    private const int RailGapMm = 40;
    private const int MaxDoorMm = 800;
    private const int EqualSplitMax = 1600;

    public sealed record Panel(int Position, int WidthMm, int HeightMm, bool IsDoor);

    public static IReadOnlyList<Panel> ComputeInitial(int measureMm, int heightMm)
    {
        var total = measureMm + RailGapMm;

        int fixedMm, doorMm;
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

        return
        [
            new Panel(0, fixedMm, heightMm, false),
            new Panel(1, doorMm,  heightMm, true),
        ];
    }

    // Matches JavaScript Math.round() — rounds 0.5 away from zero
    private static int JsRound(double value) =>
        (int)Math.Round(value, MidpointRounding.AwayFromZero);
}
