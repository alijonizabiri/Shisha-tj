namespace Shisha.Application.Analytics;

public interface IFinancesReportPdfService
{
    byte[] Generate(ExportDataDto data);
}
