using Shisha.Application.Designer;

namespace Shisha.Application.Tests.Designer;

public sealed class PanelComputerTests
{
    // ── Reference cases from docs/DesignerLogic.md ────────────────────────────

    [Fact]
    public void ComputeInitial_600mm_EqualSplit320()
    {
        var panels = PanelComputer.ComputeInitial(600, 2000);
        Assert.Equal(2, panels.Count);
        Assert.Equal(320, panels[0].WidthMm);
        Assert.False(panels[0].IsDoor);
        Assert.Equal(0, panels[0].Position);
        Assert.Equal(320, panels[1].WidthMm);
        Assert.True(panels[1].IsDoor);
        Assert.Equal(1, panels[1].Position);
    }

    [Fact]
    public void ComputeInitial_1560mm_EqualSplit800()
    {
        var panels = PanelComputer.ComputeInitial(1560, 2000);
        Assert.Equal(2, panels.Count);
        Assert.Equal(800, panels[0].WidthMm);
        Assert.False(panels[0].IsDoor);
        Assert.Equal(800, panels[1].WidthMm);
        Assert.True(panels[1].IsDoor);
    }

    [Fact]
    public void ComputeInitial_1660mm_Fixed900_Door800()
    {
        var panels = PanelComputer.ComputeInitial(1660, 2000);
        Assert.Equal(900, panels[0].WidthMm);
        Assert.False(panels[0].IsDoor);
        Assert.Equal(800, panels[1].WidthMm);
        Assert.True(panels[1].IsDoor);
    }

    [Fact]
    public void ComputeInitial_2000mm_Fixed1240_Door800()
    {
        var panels = PanelComputer.ComputeInitial(2000, 2000);
        Assert.Equal(1240, panels[0].WidthMm);
        Assert.False(panels[0].IsDoor);
        Assert.Equal(800, panels[1].WidthMm);
        Assert.True(panels[1].IsDoor);
    }

    [Theory]
    [InlineData(600)]
    [InlineData(900)]
    [InlineData(1200)]
    [InlineData(1560)]
    [InlineData(1660)]
    [InlineData(2000)]
    [InlineData(2500)]
    [InlineData(3000)]
    public void ComputeInitial_WidthsSumToMeasurePlusForty(int measureMm)
    {
        var panels = PanelComputer.ComputeInitial(measureMm, 2000);
        var sum = panels.Sum(p => p.WidthMm);
        Assert.Equal(measureMm + 40, sum);
    }

    [Fact]
    public void ComputeInitial_HeightMmForwardedToBothPanels()
    {
        var panels = PanelComputer.ComputeInitial(1560, 2100);
        Assert.All(panels, p => Assert.Equal(2100, p.HeightMm));
    }

    [Fact]
    public void ComputeInitial_AlwaysReturnsTwoPanels()
    {
        var panels = PanelComputer.ComputeInitial(1800, 2000);
        Assert.Equal(2, panels.Count);
    }

    [Fact]
    public void ComputeInitial_DoorIsAlwaysAtPosition1()
    {
        var panels = PanelComputer.ComputeInitial(2000, 2000);
        Assert.True(panels[1].IsDoor);
        Assert.Equal(1, panels[1].Position);
    }
}
