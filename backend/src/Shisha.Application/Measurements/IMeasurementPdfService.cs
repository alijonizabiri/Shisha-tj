namespace Shisha.Application.Measurements;

public interface IMeasurementPdfService
{
    /// <param name="format">"a4" or "a3"</param>
    byte[] Generate(MeasurementResponse measurement, string format);
}
