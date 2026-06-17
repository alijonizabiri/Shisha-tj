namespace Shisha.Application.Analytics;

public interface IFinancesReportExcelService
{
    byte[] Generate(ExportDataDto data);
}
