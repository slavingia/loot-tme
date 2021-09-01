import prisma from '@server/helpers/prisma';
import {
  removeFromServer,
} from '@server/services/Discord';
import dayjs from 'dayjs';
import { getBagsInWallet } from 'loot-sdk';
import { NextApiHandler } from 'next';

const api: NextApiHandler = async (_req, res) => {
  const usersToRefresh = await prisma.user.findMany({
    where: {
      discordId: { not: null },
      lastChecked: { lt: dayjs().subtract(1, 'minute').toDate() }
    }
  });
  for (const user of usersToRefresh) {
    const bags = await getBagsInWallet(user.address.toLowerCase());
    const filteredBags = bags.filter(bag =>
      bag.chest.toLowerCase().includes('book')
    );
    console.log(
      `${user.username} ${user.address} has ${
        filteredBags.length
      } books: (${filteredBags.map(bag => bag.chest).join(', ')})`
    );
    if (filteredBags.length == 0 && user.inServer) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastChecked: new Date(), inServer: false, books: [] }
      });
      try {
        console.log(`Removing ${user.username} from server`);
        await removeFromServer(user.id);
      } catch (err) {
        console.log(err);
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastChecked: new Date(),
          inServer: true,
          books: filteredBags.map(bag => bag.chest)
        }
      });
    }
  }
  return res.json({ success: true });
};

export default api;
