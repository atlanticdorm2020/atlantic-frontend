import { AccessTime, ArrowForward, EventOutlined, PhoneOutlined } from '@mui/icons-material';
import { Box, Button, Card, CardContent, CardMedia, Stack, Typography } from '@mui/material';

export function RoomCard({ room, bookingHref = '#contacts' }) {
  return (
    <Card className="room-card">
      <Box className="card-image-wrap">
        <CardMedia component="img" image={room.image} alt={room.title} className="card-image" />
        <Typography className="room-price-badge">{room.price} <span>/ 1 night</span></Typography>
      </Box>
      <CardContent className="room-card-content">
        <Typography component="h3" className="card-title"><a href={bookingHref}>{room.title}</a></Typography>
        <Typography className="room-description">{room.description}</Typography>
        <Button href={bookingHref} className="card-action" endIcon={<ArrowForward />}>See availability</Button>
      </CardContent>
    </Card>
  );
}

export function BranchCard({ branch }) {
  const href = `/branch/${branch.id}`;

  return (
    <Card className="room-card branch-card">
      <Box className="card-image-wrap">
        <CardMedia component="img" image={branch.image} alt={`${branch.name} branch`} className="card-image" />
        {branch.upcoming ? (
          <Typography className="room-price-badge">Upcoming</Typography>
        ) : (
          <Typography className="room-price-badge">{branch.name}</Typography>
        )}
      </Box>
      <CardContent className="room-card-content">
        <Typography component="h3" className="card-title"><a href={href}>{branch.name} Branch</a></Typography>
        <Typography className="room-description">{branch.address}</Typography>
        {branch.phone && branch.phone !== 'N/A' && (
          <Typography className="branch-card-phone">
            <PhoneOutlined /> {branch.phone}
          </Typography>
        )}
        <Button href={href} className="card-action" endIcon={<ArrowForward />}>
          View branch
        </Button>
      </CardContent>
    </Card>
  );
}

export function BusinessCard({ business }) {
  const href = business.href || '/contacts';
  const action = business.action || 'Inquire now';

  return (
    <Card className="room-card business-card">
      <Box className="card-image-wrap">
        <CardMedia component="img" image={business.image} alt={business.title} className="card-image" />
        <Typography className="room-price-badge">{business.category}</Typography>
      </Box>
      <CardContent className="room-card-content">
        <Typography component="h3" className="card-title"><a href={href}>{business.title}</a></Typography>
        <Typography className="room-description">{business.description}</Typography>
        <Button href={href} className="card-action" endIcon={<ArrowForward />}>
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}

export function NewsCard({ article }) {
  return (
    <Card className="news-card">
      <Box className="card-image-wrap news-image-wrap">
        <CardMedia component="img" image={article.image} alt="" className="card-image" />
        <span className="news-category">{article.category}</span>
      </Box>
      <CardContent className="news-card-content">
        <Typography component="h3" className="news-title"><a href="#news">{article.title}</a></Typography>
        <Typography className="news-description">{article.description}</Typography>
        <Stack direction="row" spacing={2} className="news-meta">
          <span><EventOutlined /> {article.date}</span>
          <span><AccessTime /> {article.readTime}</span>
        </Stack>
      </CardContent>
    </Card>
  );
}
