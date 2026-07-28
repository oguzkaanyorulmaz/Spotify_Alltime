using System;

namespace SpotifyAllTime.Domain.ValueObjects;

public class SpotifyUri
{
    public string Value { get; }

    public SpotifyUri(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith("spotify:track:"))
        {
            throw new ArgumentException("Gecersiz Spotify track URI formati.", nameof(value));
        }
        Value = value;
    }

    public static implicit operator string(SpotifyUri uri) => uri.Value;
    public static implicit operator SpotifyUri(string value) => new(value);

    public override bool Equals(object? obj) => obj is SpotifyUri other && Value == other.Value;
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;
}
