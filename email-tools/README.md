# Email Tools - SOS Expat

Email marketing tools, templates, and automation scripts for SOS Expat campaigns.

## Overview

This directory contains email marketing resources including HTML templates, sending scripts, and migration documentation for email infrastructure.

## Structure

```
email-tools/
├── templates/           # HTML email templates
│   ├── base/           # Base templates and layouts
│   ├── campaigns/      # Campaign-specific templates
│   └── transactional/  # Transactional email templates
├── scripts/            # Email sending and automation scripts
│   ├── send/          # Bulk sending scripts
│   ├── validate/      # Email validation tools
│   └── analytics/     # Tracking and analytics
├── backup-cold/        # Cold email backup templates
└── docs/              # Documentation
    └── PLAN_MIGRATION_HETZNER.md
```

## Templates

### Base Templates

Located in `templates/base/`:
- Responsive HTML layouts
- Consistent branding and styling
- Mobile-optimized designs

### Campaign Templates

Located in `templates/campaigns/`:
- Newsletter templates
- Promotional email templates
- Announcement templates
- Seasonal campaign templates

### Transactional Templates

Located in `templates/transactional/`:
- Welcome emails
- Password reset
- Account notifications
- Receipt emails

## Scripts

### Sending Scripts

Located in `scripts/send/`:

```bash
# Example: Send bulk campaign
node scripts/send/bulk-campaign.js --template=newsletter --list=subscribers
```

### Validation Tools

Located in `scripts/validate/`:

```bash
# Validate email list
node scripts/validate/check-emails.js --input=list.csv
```

### Analytics

Located in `scripts/analytics/`:
- Open rate tracking
- Click-through rate analysis
- Bounce handling

## Cold Email Backups

The `backup-cold/` directory contains:
- Backup templates for cold email campaigns
- Historical templates for reference
- A/B test variations

## Usage

### Using Templates

1. Choose appropriate template from `templates/`
2. Customize content and variables
3. Test rendering across email clients
4. Deploy via sending scripts

### Running Scripts

```bash
# Install dependencies (if needed)
npm install

# Run email sending script
node scripts/send/campaign.js --config=config.json

# Validate email list
node scripts/validate/emails.js --input=list.csv --output=valid.csv
```

## Configuration

Email sending scripts typically require configuration:

```json
{
  "smtp": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "user@example.com",
      "pass": "password"
    }
  },
  "from": {
    "name": "SOS Expat",
    "email": "noreply@sos-expat.com"
  },
  "tracking": {
    "enabled": true,
    "domain": "track.sos-expat.com"
  }
}
```

## Migration Documentation

### Hetzner Migration Plan

See `docs/PLAN_MIGRATION_HETZNER.md` for:
- Email infrastructure migration strategy
- DNS configuration
- SMTP setup on Hetzner
- Deliverability optimization
- SPF, DKIM, DMARC configuration

## Best Practices

### Template Design

- Use inline CSS for maximum compatibility
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Keep width under 600px for mobile compatibility
- Use alt text for images
- Include plain text version

### Email Sending

- Respect rate limits to avoid blacklisting
- Implement proper unsubscribe mechanisms
- Monitor bounce rates and clean lists regularly
- Use double opt-in for subscriptions
- Segment lists for targeted campaigns

### Deliverability

- Warm up new IP addresses gradually
- Maintain sender reputation
- Monitor spam complaint rates
- Keep content relevant and valuable
- Avoid spam trigger words

## Tools and Dependencies

Common tools used:
- **Nodemailer**: Node.js email sending
- **Handlebars**: Template rendering
- **Juice**: CSS inlining
- **Email-validator**: Email validation
- **MJML**: Responsive email framework (optional)

## Testing

### Email Client Testing

Test templates in:
- Gmail (web, mobile app)
- Outlook (desktop, web)
- Apple Mail (macOS, iOS)
- Thunderbird
- Yahoo Mail

### Spam Testing

Use tools like:
- Mail-tester.com
- GlockApps
- Litmus Spam Testing

## Documentation

Additional documentation:
- **Migration Plan**: `docs/PLAN_MIGRATION_HETZNER.md` - Infrastructure migration
- **Template Guide**: Best practices for template development
- **Sending Guide**: Email sending strategies and limits

## Monitoring

Track key metrics:
- **Delivery Rate**: Emails successfully delivered
- **Open Rate**: Percentage of opened emails
- **Click Rate**: Link click-through rate
- **Bounce Rate**: Hard and soft bounces
- **Unsubscribe Rate**: Opt-out percentage
- **Spam Complaints**: Spam reports

## Troubleshooting

### Common Issues

1. **High Bounce Rate**: Clean email list, verify addresses
2. **Low Open Rate**: Improve subject lines, test send times
3. **Spam Folder**: Check SPF/DKIM/DMARC, review content
4. **Rendering Issues**: Test in multiple clients, use inline CSS

## Related Projects

- **Backlink Engine**: `../backlink-engine/` - Automated outreach
- **SOS Expat Main**: `../sos/` - Main application
- **Telegram Engine**: `../../Telegram-Engine/` - Telegram marketing

## Support

For email infrastructure questions:
- Check Hetzner documentation
- Review SPF/DKIM/DMARC setup
- Monitor sending reputation
- Consult migration plan documentation

## License

Proprietary - All rights reserved
